import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Textarea } from "../../components/ui/Textarea";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/Alert";
import { useParams, useNavigate } from "react-router-dom";
import SuccessModal from "../../components/ui/SuccessModal";

// Definir la estructura de una unidad
interface Unit {
  number: string;
  floor: string;
  owner_name: string;
  coefficient: number;
  email?: string;
  phone?: string;
  area?: number;
  expense_categories: string[];
  // Campos adicionales para visualización (no se guardarán en la BD)
  debt_rounding?: number; // Deuda/Redondeo
  interest?: number;      // Interés
  total_debt?: number;    // Suma de deuda/redondeo + interés
  // Campos para almacenar el texto ingresado por el usuario
  debt_rounding_text?: string; // Texto ingresado para deuda/redondeo
  interest_text?: string;      // Texto ingresado para interés
}

export default function UnitTextImporter() {
  const { id: condominiumId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [rawText, setRawText] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const parseText = () => {
    if (!condominiumId) {
      setError('ID del consorcio no encontrado');
      return;
    }

    if (!rawText.trim()) {
      setError('El texto está vacío');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const lines = rawText.trim().split('\n');
      const parsedUnits: Unit[] = [];

      for (const line of lines) {
        // Verificar si la línea tiene el formato esperado (número|resto)
        if (!/^\d+\|/.test(line.trim())) continue;
        
        const [number, rest] = line.trim().split('|');
        
        // Extraer el piso completo con la letra (ej: "P.B C" o "1 B")
        // El formato parece ser: número|piso letra resto...
        let floor = '';
        let remainingText = '';
        
        // Patrón para capturar el piso con su letra (ej: "P.B C" o "1 B" o "1 A")
        const pisoMatch = rest.trim().match(/^([\w\.]+\s+[A-Z])\s+(.*)$/);
        
        if (pisoMatch) {
          // Capturamos el piso con su letra
          floor = pisoMatch[1];
          // El resto del texto es el nombre del propietario
          remainingText = pisoMatch[2];
        } else {
          // Si no encontramos el patrón, usamos el método anterior
          const tokens = rest.trim().split(/\s+/);
          floor = tokens[0] || '';
          remainingText = rest.trim().substring(floor.length).trim();
        }
        
        // Dividir el texto restante en tokens para buscar el coeficiente
        const restTokens = rest.trim().split(/\s+/);
        
        // Buscar el coeficiente (valor 2656 en el ejemplo)
        let coefficient = 0;
        
        // Primero intentamos encontrar un número de 4 dígitos que podría ser el coeficiente
        for (let i = 0; i < restTokens.length; i++) {
          // Limpiar el token de cualquier carácter no numérico
          const cleanToken = restTokens[i].replace(/[^0-9]/g, '');
          
          // Si es un número de 4 dígitos, probablemente es el coeficiente
          if (cleanToken.length === 4 && !isNaN(parseInt(cleanToken))) {
            // Convertir a porcentaje real (ej: 2656 -> 0.02656 que es 2.656%)
            coefficient = parseInt(cleanToken) / 100000;
            break;
          }
        }
        
        // Si no encontramos un número de 4 dígitos, buscamos cualquier número como respaldo
        if (coefficient === 0) {
          for (let i = restTokens.length - 1; i >= 0; i--) {
            const num = parseFloat(restTokens[i].replace(',', '.'));
            if (!isNaN(num)) {
              // Asumimos que es un porcentaje y lo convertimos a decimal
              coefficient = num / 10000;
              break;
            }
          }
        }

        // El nombre del propietario ya está en remainingText
        // Solo necesitamos eliminar los números al final
        let ownerName = remainingText;
        
        // Eliminar cualquier número al final del nombre
        const nameTokens = remainingText.split(/\s+/);
        const ownerNameParts: string[] = [];
        for (let i = 0; i < nameTokens.length; i++) {
          const part = nameTokens[i];
          const num = parseFloat(part.replace(',', '.'));
          if (!isNaN(num)) {
            break;
          }
          ownerNameParts.push(part);
        }
        
        if (ownerNameParts.length > 0) {
          ownerName = ownerNameParts.join(' ');
        }

        // Buscar valores de deuda/redondeo e interés en el texto
        let debtRounding = 0;
        let interest = 0;
        
        // Intentamos extraer los valores de la línea completa
        const fullLine = line.trim();
        
        // Buscar patrones de números con formato de moneda
        // Pueden tener puntos como separadores de miles y comas para decimales
        const moneyPattern = /([-+]?[\d.,]+)/g;
        const moneyMatches = fullLine.match(moneyPattern) || [];
        
        // Filtrar y convertir los valores a números
        const numericValues = moneyMatches
            .map(val => {
                const cleanVal = String(val).trim(); // Asegurar que es string
                let numericString = cleanVal;

                // Específicamente para formato como "1.234.567,89"
                // 1. Quitar todos los puntos (asumidos separadores de miles)
                numericString = numericString.replace(/\./g, '');
                // 2. Reemplazar la coma (asumida separador decimal) por un punto
                numericString = numericString.replace(/,/g, '.');
                
                const result = parseFloat(numericString);
                // console.log(`Original: "${cleanVal}", Processed: "${numericString}", Parsed: ${result}`); // Para depuración
                return result;
            })
            .filter(val => !isNaN(val));
        
        console.log(`Unidad ${number} - Valores numéricos encontrados:`, numericValues);
        
        // Determinar si esta línea tiene valores de deuda/redondeo e interés
        // Verificamos si hay suficientes valores numéricos y si hay patrones específicos
        
        // Buscar el índice del coeficiente (un valor pequeño como 2.6xx)
        const coefficientIndex = numericValues.findIndex(val => val > 2.5 && val < 3);
        
        if (coefficientIndex === -1 || coefficientIndex < 3) {
            // No encontramos el coeficiente o no hay suficientes valores antes del coeficiente
            console.log(`Unidad ${number} - No se detectaron patrones claros de deuda/interés`);
            debtRounding = 0;
            interest = 0;
        } else {
            // Tenemos suficientes valores antes del coeficiente
            // Verificar si hay un valor negativo (posible redondeo)
            const negativeIndex = numericValues.findIndex(val => val < 0);
            
            if (negativeIndex !== -1 && negativeIndex < coefficientIndex) {
                // Si hay un valor negativo antes del coeficiente, es probablemente el redondeo
                debtRounding = numericValues[negativeIndex];
                // El interés podría estar ausente en este caso
                interest = 0;
            } else {
                // Buscamos patrones específicos basados en la tabla de ejemplo
                // En la tabla, el redondeo suele estar 2 posiciones antes del coeficiente
                // y el interés 1 posición antes del coeficiente
                
                // Verificamos si hay valores grandes que podrían ser redondeo (como 253.603,52)
                const largeValueIndex = numericValues.findIndex((val, index) => val > 10000 && index < coefficientIndex);
                
                if (largeValueIndex !== -1 && largeValueIndex < coefficientIndex - 1) {
                    // Encontramos un valor grande que podría ser el redondeo
                    debtRounding = numericValues[largeValueIndex];
                    
                    // El interés podría estar en la siguiente posición
                    if (largeValueIndex + 1 < coefficientIndex) {
                        interest = numericValues[largeValueIndex + 1];
                    } else {
                        interest = 0;
                    }
                } else {
                    // No encontramos patrones claros, dejamos los valores en 0
                    debtRounding = 0;
                    interest = 0;
                }
            }
        }
        
        console.log(`Unidad ${number} - Deuda/Redondeo: ${debtRounding}, Interés: ${interest}`);

        
        // Calcular el total de la deuda (suma de deuda/redondeo + interés)
        const totalDebt = debtRounding + interest;
        
        // Crear una nueva unidad con los datos extraídos
        const newUnit: Unit = {
          number,
          floor,
          owner_name: ownerName,
          coefficient,
          email: `unidad${number}@ejemplo.com`, // Email ficticio predeterminado
          phone: `11-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`, // Teléfono ficticio predeterminado
          area: 50, // Valor predeterminado como en el ejemplo
          expense_categories: ['expensas_ordinarias_a', 'expensas_aysa'], // Categorías por defecto
          debt_rounding: debtRounding,
          interest: interest,
          total_debt: totalDebt
        };

        parsedUnits.push(newUnit);
      }

      if (parsedUnits.length === 0) {
        setError('No se encontraron unidades válidas en el texto');
        setLoading(false);
        return;
      }

      setUnits(parsedUnits);
      setLoading(false);
    } catch (error) {
      setError(`Error al procesar el texto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setLoading(false);
    }
  }

  // Función para manejar números con decimales
  const handleNumericInput = (value: string): number => {
    // Si está vacío, devolver 0
    if (!value || value.trim() === '') return 0;
    
    // Si es solo un punto decimal o coma, tratar como 0
    if (value === '.' || value === ',') return 0;
    
    // Hacer una copia del valor para no modificar el original
    let processedValue = value.trim();
    
    // Caso 1: Formato argentino con puntos como separadores de miles y coma decimal (253.603,52)
    if (processedValue.includes('.') && processedValue.includes(',')) {
      // Eliminar todos los puntos y reemplazar la coma por punto
      processedValue = processedValue.replace(/\./g, '').replace(',', '.');
      console.log(`Formato argentino detectado: ${value} -> ${processedValue}`);
      
      // Mostrar el valor exacto para depuración
      const numValue = parseFloat(processedValue);
      console.log(`Valor convertido: ${value} -> ${numValue}`);
      return numValue; // Retornar directamente el valor procesado
    }
    // Caso 2: Solo coma como separador decimal (253603,52)
    else if (processedValue.includes(',')) {
      // Reemplazar la coma por punto
      processedValue = processedValue.replace(',', '.');
      console.log(`Coma decimal detectada: ${value} -> ${processedValue}`);
    }
    // Caso 3: Detectar si es un número entero que representa un valor con centavos (como 25360352)
    else if (processedValue.length > 2 && !processedValue.includes('.')) {
      // Verificar si los últimos dos dígitos son centavos
      const integerPart = processedValue.slice(0, -2);
      const decimalPart = processedValue.slice(-2);
      
      // Crear el número con formato decimal
      processedValue = `${integerPart}.${decimalPart}`;
      console.log(`Número con centavos detectado: ${value} -> ${processedValue}`);
    }
    // Caso 4: Punto como separador de miles (2.536352 para 2536352 o 25363.52)
    else if (processedValue.includes('.')) {
      // Verificar si el punto está cerca del final (posible separador decimal)
      const pointIndex = processedValue.lastIndexOf('.');
      const charsAfterPoint = processedValue.length - pointIndex - 1;
      
      if (charsAfterPoint <= 2) {
        // Es un separador decimal normal, no hacer nada
        console.log(`Punto decimal detectado: ${value}`);
      } else {
        // Es un separador de miles, eliminar todos los puntos
        // y luego tratar los últimos dos dígitos como centavos
        const withoutPoints = processedValue.replace(/\./g, '');
        const integerPart = withoutPoints.slice(0, -2);
        const decimalPart = withoutPoints.slice(-2);
        processedValue = `${integerPart}.${decimalPart}`;
        console.log(`Punto como separador de miles: ${value} -> ${processedValue}`);
      }
    }
    
    // Convertir a número
    const numValue = parseFloat(processedValue);
    
    // Si no es un número válido, devolver 0
    if (isNaN(numValue)) {
      console.log(`Valor no válido: ${value}`);
      return 0;
    }
    
    console.log(`Valor procesado: ${value} -> ${processedValue} -> ${numValue}`);
    return numValue;
  };
  
  const updateUnitField = (idx: number, field: keyof Unit, value: string | number | boolean) => {
    setUnits(units.map((unit, i) => {
      if (i === idx) {
        let processedValue = value;
        
        // Convertir a número si el campo es numérico y el valor es una cadena
        if (typeof value === 'string' && 
            (field === 'coefficient' || field === 'area' || field === 'debt_rounding' || field === 'interest')) {
          
          // Procesar el valor numérico
          processedValue = handleNumericInput(value);
          console.log(`Campo ${String(field)}: Valor original: "${value}", Procesado: ${processedValue}`);
        }

        const updatedUnit = { ...unit, [field]: processedValue };

        // Recalcular total_debt si debt_rounding o interest cambian
        if (field === 'debt_rounding' || field === 'interest') {
          const debt = Number(updatedUnit.debt_rounding || 0);
          const intr = Number(updatedUnit.interest || 0);
          
          // Sumar y redondear a 2 decimales para evitar errores de punto flotante
          const total = debt + intr;
          updatedUnit.total_debt = Math.round(total * 100) / 100;
          
          console.log(`Calculando total: ${debt} + ${intr} = ${updatedUnit.total_debt}`);
        }
        return updatedUnit;
      }
      return unit;
    }));
  };

  // Función para manejar cambios en las categorías de expensas
  const handleExpenseCategoryChange = (index: number, category: string, checked: boolean) => {
    const updatedUnits = [...units];
    if (checked) {
      // Agregar la categoría si no existe
      if (!updatedUnits[index].expense_categories.includes(category)) {
        updatedUnits[index].expense_categories.push(category);
      }
    } else {
      // Remover la categoría si existe
      updatedUnits[index].expense_categories = updatedUnits[index].expense_categories.filter(c => c !== category);
    }
    setUnits(updatedUnits);
  };

  const saveUnits = async () => {
    if (!condominiumId || units.length === 0) {
      setError('No hay unidades para guardar o falta el ID del consorcio');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Asegurarnos de que todos los campos necesarios tengan valores y que tengan el formato correcto
      const unitsToSave = units.map(unit => {
        // Verificar la estructura de la tabla units en Supabase
        return {
          number: String(unit.number).trim(),
          type: unit.floor, // Usamos el campo floor como tipo
          owner_name: String(unit.owner_name).trim(),
          condominium_id: condominiumId,
          // Campos opcionales con valores predeterminados
          owner_email: unit.email || `unidad${unit.number}@ejemplo.com`,
          owner_phone: unit.phone || `11-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          area: unit.area || 50,
          coefficient: unit.coefficient,
          expense_categories: unit.expense_categories
        };
      });
      
      console.log('Datos a guardar:', unitsToSave);
      
      // Primero verificamos si las unidades ya existen
      const { data: existingUnits } = await supabase
        .from('units')
        .select('id, number')
        .eq('condominium_id', condominiumId);
      
      // Crear un conjunto de números de unidades existentes para búsqueda rápida
      const existingUnitNumbers = new Set(existingUnits?.map(u => u.number) || []);
      // Crear un mapa de números de unidades a IDs para guardar las deudas iniciales
      const unitNumberToId: Record<string, string> = {};
      existingUnits?.forEach(u => {
        unitNumberToId[u.number] = u.id;
      });
      
      // Separar unidades para insertar y actualizar
      const unitsToInsert = [];
      const unitsToUpdate = [];
      
      for (const unit of unitsToSave) {
        if (existingUnitNumbers.has(unit.number)) {
          unitsToUpdate.push(unit);
        } else {
          unitsToInsert.push(unit);
        }
      }
      
      // Insertar nuevas unidades si hay alguna
      let insertedUnits = [];
      if (unitsToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from('units')
          .insert(unitsToInsert)
          .select('id, number');
        
        if (insertError) {
          console.error('Error al insertar nuevas unidades:', insertError);
          throw new Error(`Error al insertar nuevas unidades: ${insertError.message}`);
        }
        
        insertedUnits = data || [];
        // Actualizar el mapa de números de unidades a IDs con las unidades recién insertadas
        insertedUnits.forEach(u => {
          unitNumberToId[u.number] = u.id;
        });
      }
      
      // Actualizar unidades existentes una por una
      for (const unit of unitsToUpdate) {
        const { error: updateError } = await supabase
          .from('units')
          .update(unit)
          .eq('number', unit.number)
          .eq('condominium_id', condominiumId);
        
        if (updateError) {
          console.error(`Error al actualizar la unidad ${unit.number}:`, updateError);
          throw new Error(`Error al actualizar la unidad ${unit.number}: ${updateError.message}`);
        }
      }
      
      // Mostrar datos de todas las unidades para depuración
      console.log('DEPURACIÓN: Preparando datos de todas las unidades');
      console.log('Mapa de números de unidad a IDs:', unitNumberToId);
      
      // Preparar datos para la tabla de deuda inicial (todas las unidades)
      const initialDebtData = [];
      
      for (const unit of units) {
        // Convertir a números para asegurar valores correctos
        const debtAmount = Number(unit.debt_rounding || 0);
        const interestAmount = Number(unit.interest || 0);
        const totalAmount = Number(unit.total_debt || 0);
        
        console.log(`DEPURACIÓN: Unidad ${unit.number} - Deuda: ${debtAmount}, Interés: ${interestAmount}, Total: ${totalAmount}`);
        
        // Verificar que tengamos el ID de la unidad
        const unitId = unitNumberToId[unit.number];
        if (!unitId) {
          console.warn(`No se encontró ID para la unidad ${unit.number}`);
          continue; // Saltar esta unidad
        }
        
        console.log(`ID encontrado para unidad ${unit.number}: ${unitId}`);
        
        // Crear objeto de datos de deuda (incluso con valores en cero)
        const debtData = {
          unit_id: unitId,
          condominium_id: condominiumId,
          debt_amount: debtAmount,
          interest_amount: interestAmount,
          total_amount: totalAmount,
          created_at: new Date().toISOString(),
          // Si no tiene deuda ni interés, marcar como "sin_deuda", de lo contrario como "pendiente"
          status: (debtAmount === 0 && interestAmount === 0) ? 'sin_deuda' : 'pendiente'
        };
        
        console.log(`Datos de deuda preparados para unidad ${unit.number}:`, debtData);
        initialDebtData.push(debtData);
      }
      
      // Guardar datos de deuda inicial si hay alguno
      if (initialDebtData.length > 0) {
        console.log(`DEPURACIÓN: Intentando guardar ${initialDebtData.length} registros de deuda inicial`);
        console.log('Datos a guardar:', JSON.stringify(initialDebtData));
        
        try {
          // Primero verificar si la tabla existe
          const { error: checkError } = await supabase
            .from('initial_debt')
            .select('id')
            .limit(1);
          
          if (checkError) {
            console.error('Error al verificar la tabla initial_debt:', checkError);
            setError(`Las unidades se guardaron correctamente, pero la tabla initial_debt no existe o no es accesible: ${checkError.message}`);
          } else {
            // La tabla existe, intentar insertar los datos
            const { data, error: debtError } = await supabase
              .from('initial_debt')
              .insert(initialDebtData);
            
            if (debtError) {
              console.error('Error al guardar datos de deuda inicial:', debtError);
              setError(`Las unidades se guardaron correctamente, pero hubo un error al guardar los datos de deuda inicial: ${debtError.message}`);
            } else {
              console.log('Datos de deuda inicial guardados correctamente');
              setSuccess(success => success + ' y se guardaron los datos de deuda inicial.');
            }
          }
        } catch (error) {
          console.error('Excepción al guardar datos de deuda inicial:', error);
          setError(`Las unidades se guardaron correctamente, pero hubo una excepción al guardar los datos de deuda inicial: ${error.message}`);
        }
      } else {
        console.log('No hay datos de deuda inicial para guardar');
      }
      
      const mensaje = `Unidades guardadas correctamente: ${unitsToInsert.length} nuevas, ${unitsToUpdate.length} actualizadas`;
      setSuccess(mensaje);
      setSuccessMessage(mensaje);
      setShowSuccessModal(true);
      // No redirigimos automáticamente, dejamos que el modal se cierre primero
      
    } catch (error: any) {
      console.error('Error al guardar las unidades:', error);
      if (error.status === 409) {
        setError('Error de conflicto al guardar las unidades. Por favor, revise los datos y vuelva a intentarlo.');
      } else {
        setError(`Error al guardar las unidades: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Función para cerrar el modal de éxito
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Redirigir a la página de detalles del consorcio después de cerrar el modal
    navigate(`/condominiums/${condominiumId}`);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          onClick={() => navigate(`/consorcios/${condominiumId}`)}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Importar Unidades desde Texto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar Unidades</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Pegue aquí el texto a importar..."
              className="min-h-[200px] font-mono"
            />
            <div className="space-x-2">
              <Button
                onClick={parseText}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Procesando...' : 'Previsualizar Unidades'}
              </Button>
            </div>
          </div>

          {units.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Unidades detectadas</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm mt-2">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-gray-300 p-2">Nro</th>
                      <th className="border border-gray-300 p-2">Piso</th>
                      <th className="border border-gray-300 p-2">Propietario</th>
                      <th className="border border-gray-300 p-2">Email</th>
                      <th className="border border-gray-300 p-2">Teléfono</th>
                      <th className="border border-gray-300 p-2">Área (m²)</th>
                      <th className="border border-gray-300 p-2">Coeficiente</th>
                      <th className="border border-gray-300 p-2">Deuda/Redondeo</th>
                      <th className="border border-gray-300 p-2">Interés</th>
                      <th className="border border-gray-300 p-2 bg-red-600">Total Deuda</th>
                      <th className="border px-4 py-2">Ordinarias A</th>
                      <th className="border px-4 py-2">Ordinarias B</th>
                      <th className="border px-4 py-2">AYSA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit, idx) => (
                      <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={unit.number}
                            onChange={(e) => updateUnitField(idx, "number", e.target.value)}
                            className="w-full p-1 border rounded"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={unit.floor}
                            onChange={(e) => updateUnitField(idx, "floor", e.target.value)}
                            className="w-full p-1 border rounded"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={unit.owner_name}
                            onChange={(e) => updateUnitField(idx, "owner_name", e.target.value)}
                            className="w-full p-1 border rounded"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="email"
                            value={unit.email || ''}
                            onChange={(e) => updateUnitField(idx, "email", e.target.value)}
                            className="w-full p-1 border rounded"
                            placeholder="email@ejemplo.com"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={unit.phone || ''}
                            onChange={(e) => updateUnitField(idx, "phone", e.target.value)}
                            className="w-full p-1 border rounded"
                            placeholder="Teléfono"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={unit.area || 0}
                            onChange={(e) => updateUnitField(idx, "area", Number(e.target.value))}
                            className="w-full p-1 border rounded"
                            min={0}
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={unit.coefficient}
                            onChange={(e) => updateUnitField(idx, "coefficient", Number(e.target.value))}
                            className="w-full p-1 border rounded"
                            step="0.001"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            defaultValue={unit.debt_rounding || ''}
                            onBlur={(e) => {
                              // Solo procesar el valor cuando el usuario termina de editar
                              const inputValue = e.target.value;
                              if (inputValue.trim() !== '') {
                                // Guardar el valor numérico para cálculos
                                const numValue = handleNumericInput(inputValue);
                                updateUnitField(idx, "debt_rounding", numValue);
                              } else {
                                updateUnitField(idx, "debt_rounding", 0);
                              }
                            }}
                            className="w-full p-1 border rounded"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            defaultValue={unit.interest || ''}
                            onBlur={(e) => {
                              // Solo procesar el valor cuando el usuario termina de editar
                              const inputValue = e.target.value;
                              if (inputValue.trim() !== '') {
                                // Guardar el valor numérico para cálculos
                                const numValue = handleNumericInput(inputValue);
                                updateUnitField(idx, "interest", numValue);
                              } else {
                                updateUnitField(idx, "interest", 0);
                              }
                            }}
                            className="w-full p-1 border rounded"
                          />
                        </td>
                        <td className="border border-gray-300 p-2 text-right"> {/* Total Deuda */}
                          {unit.total_debt !== undefined 
                            ? unit.total_debt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                            : '0,00'}
                        </td>
                        <td className="border px-4 py-2">
                          <input
                            type="checkbox"
                            checked={unit.expense_categories.includes('expensas_ordinarias_a')}
                            onChange={(e) => handleExpenseCategoryChange(idx, 'expensas_ordinarias_a', e.target.checked)}
                          />
                        </td>
                        <td className="border px-4 py-2">
                          <input
                            type="checkbox"
                            checked={unit.expense_categories.includes('expensas_ordinarias_b')}
                            onChange={(e) => handleExpenseCategoryChange(idx, 'expensas_ordinarias_b', e.target.checked)}
                          />
                        </td>
                        <td className="border px-4 py-2">
                          <input
                            type="checkbox"
                            checked={unit.expense_categories.includes('expensas_aysa')}
                            onChange={(e) => handleExpenseCategoryChange(idx, 'expensas_aysa', e.target.checked)}
                          />
                        </td>
                      </tr>
                    ))}
                    
                    {/* Fila de totales */}
                    <tr className="border-t-2 border-gray-500 font-bold bg-gray-100">
                      <td colSpan={9} className="border border-gray-300 p-2 text-right">
                        TOTAL COEFICIENTES:
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {units.reduce((sum, unit) => sum + (unit.coefficient || 0), 0).toFixed(5)}
                        {' '}
                        ({(units.reduce((sum, unit) => sum + (unit.coefficient || 0), 0) * 100).toFixed(3)}%)
                      </td>
                      <td colSpan={3} className="border border-gray-300 p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex space-x-4">
                <Button
                  onClick={saveUnits}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? 'Guardando...' : 'Guardar Unidades'}
                </Button>
                
                <Button
                  onClick={() => navigate(`/consorcios/${condominiumId}`)}
                  variant="outline"
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de éxito */}
      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={handleCloseSuccessModal} 
        message={successMessage} 
      />
    </div>
  );
}
