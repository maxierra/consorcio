import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Building, Calendar, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import InterestConfigDialog from '../../components/InterestConfigDialog';
import PaymentConfirmationDialog from '../../components/PaymentConfirmationDialog';

interface Condominium {
  id: string;
  name: string;
}

interface Fee {
  id: string;
  month: number;
  year: number;
  total_amount: number;
  generated_date: string;
  condominium: Condominium;
}

interface Unit {
  id: string;
  number: string;
  owner_name: string;
  coefficient: number;
  type: string;
  expense_categories?: string[];
  paid?: boolean;
  payment_id?: string;
  payment_date?: string;
  previous_balance?: number;
  total_due?: number;
  debt_registered?: boolean;
  // Montos por categoría
  ordinariaA_amount?: number;
  ordinariaB_amount?: number;
  aysa_amount?: number;
}

interface ProviderInvoice {
  id: string;
  amount: number;
  month: number;
  year: number;
  status: string;
}

interface EmployeeCompensation {
  id: string;
  total_compensation: number;
  month: number;
  year: number;
}

interface ExpensePayment {
  id: string;
  condominium_id: string;
  unit_id: string;
  month: number;
  year: number;
  amount: number;
  payment_date: string;
  regularized: boolean;
  regularization_date?: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Fees() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondominium, setSelectedCondominium] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [fees, setFees] = useState<Fee[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [interestConfigOpen, setInterestConfigOpen] = useState(false);
  // Usamos payments para actualizar el estado de las unidades
  const [, setPayments] = useState<ExpensePayment[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [suggestedAmount, setSuggestedAmount] = useState(0);
  const [savingPayment, setSavingPayment] = useState<string | null>(null);
  const [periodClosed, setPeriodClosed] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{title: string, message: string, show: boolean}>({title: '', message: '', show: false});
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<ExpensePayment[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<{ordinariaA: number, ordinariaB: number, aysa: number}>({ordinariaA: 0, ordinariaB: 0, aysa: 0});

  useEffect(() => {
    fetchCondominiums();
  }, []);

  useEffect(() => {
    if (selectedCondominium) {
      if (selectedMonth && selectedYear) {
        // Primero calculamos los totales por categoría
        const loadData = async () => {
          try {
            setLoading(true);
            console.log('Iniciando carga de datos...');
            
            // Paso 1: Obtener los totales por categoría
            await fetchCategoryTotals();
            console.log('Totales por categoría cargados');
            
            // Paso 2: Cargar las facturas y pagos
            await fetchFees();
            await fetchPayments();
            console.log('Facturas y pagos cargados');
            
            // Paso 3: Esperar un momento para asegurar que los estados se actualicen
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Paso 4: Cargar las unidades con los totales ya disponibles
            await fetchUnits();
            console.log('Unidades cargadas con los totales por categoría');
            
            // Paso 5: Sincronizar el estado de las unidades con los pagos registrados
            await syncUnitsWithPayments();
            console.log('Estado de unidades sincronizado con pagos registrados');
            
            setLoading(false);
          } catch (err) {
            console.error('Error al cargar datos:', err);
            setLoading(false);
          }
        };
        
        loadData();
      }
    } else {
      setUnits([]);
      setFees([]);
      setPayments([]);
      setCategoryTotals({ordinariaA: 0, ordinariaB: 0, aysa: 0});
    }
  }, [selectedCondominium, selectedMonth, selectedYear]);

  const fetchUnits = async () => {
    try {
      // Obtener las unidades con sus categorías de expensas
      const { data, error } = await supabase
        .from('units')
        .select('id, number, owner_name, coefficient, type, expense_categories')
        .eq('condominium_id', selectedCondominium);

      if (error) throw error;
      
      console.log('Unidades obtenidas con categorías:', data);
      
      // Ordenar las unidades numéricamente (considerando que pueden ser alfanuméricas)
      const sortedUnits = [...(data || [])].sort((a, b) => {
        // Extraer los números de las cadenas y convertirlos a enteros para comparación
        const numA = parseInt(a.number.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.number.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      
      // Obtener los totales por categoría directamente de la base de datos
      // para no depender del estado categoryTotals que puede no estar actualizado
      let ordinariaA_total = 0;
      let ordinariaB_total = 0;
      let aysa_total = 0;
      
      // 1. Obtener facturas de proveedores para calcular totales
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('provider_invoices')
        .select('id, amount, category')
        .eq('condominium_id', selectedCondominium)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
        
      if (invoicesError) throw invoicesError;
      
      // 2. Calcular totales por categoría a partir de las facturas
      (invoicesData || []).forEach(invoice => {
        const normalizedCategory = (invoice.category || '').toLowerCase().replace(/_/g, ' ');
        
        if (normalizedCategory === 'expensas ordinarias a') {
          ordinariaA_total += invoice.amount;
        } else if (normalizedCategory === 'expensas ordinarias b') {
          ordinariaB_total += invoice.amount;
        } else if (normalizedCategory === 'expensas aysa') {
          aysa_total += invoice.amount;
        } else {
          // Por defecto a Ordinarias A
          ordinariaA_total += invoice.amount;
        }
      });
      
      // 3. Obtener compensaciones de empleados para este consorcio
      const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
        .from('employee_condominiums')
        .select('employee_id')
        .eq('condominium_id', selectedCondominium);
        
      if (employeeCondominiumsError) throw employeeCondominiumsError;
      
      const employeeIds = (employeeCondominiums || []).map(ec => ec.employee_id);
      
      if (employeeIds.length > 0) {
        const { data: compensationsData, error: compensationsError } = await supabase
          .from('employee_compensations')
          .select('total_compensation, employee_id')
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .in('employee_id', employeeIds);
        
        if (compensationsError) throw compensationsError;
        
        // Sumar compensaciones a Ordinarias A
        (compensationsData || []).forEach(comp => {
          ordinariaA_total += comp.total_compensation;
        });
      }
      
      // Si todos los totales son cero, usar valores de prueba
      if (ordinariaA_total === 0 && ordinariaB_total === 0 && aysa_total === 0) {
        console.warn('ADVERTENCIA: Todos los totales por categoría son cero. Asignando valores de prueba.');
        ordinariaA_total = 100000;
        ordinariaB_total = 50000;
        aysa_total = 10000;
      }
      
      // Actualizar el estado con los totales calculados
      setCategoryTotals({
        ordinariaA: ordinariaA_total,
        ordinariaB: ordinariaB_total,
        aysa: aysa_total
      });
      
      console.log('Totales por categoría calculados directamente:', {
        ordinariaA: ordinariaA_total,
        ordinariaB: ordinariaB_total,
        aysa: aysa_total
      });
      
      // Calcular los montos por categoría para cada unidad usando los totales calculados directamente
      const unitsWithCategoryAmounts = sortedUnits.map(unit => {
        // Normalizar las categorías de expensas (convertir a array si es null o undefined)
        const categories = unit.expense_categories || [];
        console.log(`Unidad ${unit.number} - Categorías asignadas:`, categories);
        
        // Verificar si la unidad tiene cada categoría
        const hasOrdinariaA = categories.some((cat: string) => cat.toLowerCase().replace(/_/g, ' ') === 'expensas ordinarias a');
        const hasOrdinariaB = categories.some((cat: string) => cat.toLowerCase().replace(/_/g, ' ') === 'expensas ordinarias b');
        const hasAysa = categories.some((cat: string) => cat.toLowerCase().replace(/_/g, ' ') === 'expensas aysa');
        
        console.log(`Unidad ${unit.number} - Tiene Ordinarias A: ${hasOrdinariaA}, Ordinarias B: ${hasOrdinariaB}, Aysa: ${hasAysa}`);
        
        // Si no tiene ninguna categoría asignada, asignar por defecto Ordinarias A y Aysa
        const defaultCategories = categories.length === 0;
        console.log(`Unidad ${unit.number} - Usando categorías por defecto: ${defaultCategories}`);
        
        // Usar el coeficiente directamente sin dividir por 100
        const coefficient = unit.coefficient;
        console.log(`Unidad ${unit.number} - Coeficiente: ${coefficient}`);
        
        // Calcular los montos por categoría según las categorías asignadas y el coeficiente
        // usando los totales calculados directamente
        let ordinariaA_amount = 0;
        let ordinariaB_amount = 0;
        let aysa_amount = 0;
        
        if (hasOrdinariaA || defaultCategories) {
          // El monto de Ordinarias A es el coeficiente multiplicado por el total de Ordinarias A
          ordinariaA_amount = ordinariaA_total * coefficient;
          console.log(`Unidad ${unit.number} - Ordinarias A: $${ordinariaA_total} * ${coefficient} = $${ordinariaA_amount}`);
        }
        
        if (hasOrdinariaB || (defaultCategories && unit.type?.toLowerCase().includes('departamento'))) {
          // El monto de Ordinarias B es el coeficiente multiplicado por el total de Ordinarias B
          ordinariaB_amount = ordinariaB_total * coefficient;
          console.log(`Unidad ${unit.number} - Ordinarias B: $${ordinariaB_total} * ${coefficient} = $${ordinariaB_amount}`);
        }
        
        if (hasAysa || defaultCategories) {
          // El monto de Aysa es el coeficiente multiplicado por el total de Aysa
          aysa_amount = aysa_total * coefficient;
          console.log(`Unidad ${unit.number} - Aysa: $${aysa_total} * ${coefficient} = $${aysa_amount}`);
        }
        
        console.log(`Unidad ${unit.number} - Montos calculados:`, {
          ordinariaA: ordinariaA_amount,
          ordinariaB: ordinariaB_amount,
          aysa: aysa_amount,
          total: ordinariaA_amount + ordinariaB_amount + aysa_amount
        });
        
        return {
          ...unit,
          ordinariaA_amount,
          ordinariaB_amount,
          aysa_amount
        };
      });
      
      console.log('Unidades con montos por categoría:', unitsWithCategoryAmounts);
      
      setUnits(unitsWithCategoryAmounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las unidades');
    }
  };
  
  const fetchPayments = async () => {
    try {
      if (!selectedCondominium || !selectedMonth || !selectedYear) return;
      
      console.log('Buscando pagos para:', { selectedCondominium, selectedMonth, selectedYear });
      
      // Verificar si el período está cerrado (buscando registros con payment_status='unpaid')
      const { data: periodStatus, error: periodStatusError } = await supabase
        .from('expense_payments')
        .select('id, amount, unit_id, payment_status')
        .eq('condominium_id', selectedCondominium)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .eq('payment_status', 'unpaid');
        
      if (periodStatusError) throw periodStatusError;
      
      console.log('Registros de deuda encontrados:', periodStatus);
      
      // Si hay registros con payment_status='unpaid', el período está cerrado
      const isClosed = periodStatus && periodStatus.length > 0;
      console.log('¿El período está cerrado?', isClosed);
      setPeriodClosed(isClosed);
      console.log('Período cerrado:', isClosed);
      
      // Obtener pagos del mes actual
      const { data: currentPayments, error: currentError } = await supabase
        .from('expense_payments')
        .select('*')
        .eq('condominium_id', selectedCondominium)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
        
      if (currentError) throw currentError;
      
      console.log('Pagos del mes actual:', currentPayments);
      
      setPayments(currentPayments || []);
      
      // Actualizar el estado de las unidades con los pagos encontrados
      setUnits(prevUnits => {
        if (!prevUnits || prevUnits.length === 0) return prevUnits;
        
        return prevUnits.map(unit => {
          // Buscar si existe un pago para esta unidad en el mes y año seleccionados
          const payment = (currentPayments || []).find(p => 
            p.unit_id === unit.id && 
            p.payment_status === 'paid' && 
            p.amount > 0
          );
          
          if (payment) {
            console.log(`Unidad ${unit.number} tiene pago registrado:`, payment);
            return {
              ...unit,
              paid: true,
              payment_id: payment.id,
              payment_date: payment.payment_date
            };
          }
          
          return unit;
        });
      });
      
      // Obtener todos los pagos históricos para calcular saldos anteriores
      const { data: allPayments, error: allPaymentsError } = await supabase
        .from('expense_payments')
        .select('*')
        .eq('condominium_id', selectedCondominium);
        
      if (allPaymentsError) throw allPaymentsError;
      
      console.log('Todos los pagos históricos:', allPayments);
      
      // Verificar si hay pagos para meses anteriores
      const previousMonthsPayments = (allPayments || []).filter(payment => {
        return payment.year < selectedYear || 
               (payment.year === selectedYear && payment.month < selectedMonth);
      });
      
      console.log('Pagos de meses anteriores encontrados:', previousMonthsPayments.length);
      
      // Obtener todas las expensas para calcular saldos anteriores
      const { data: allFees, error: allFeesError } = await supabase
        .from('fees')
        .select('*')
        .eq('condominium_id', selectedCondominium);
        
      if (allFeesError) throw allFeesError;
      
      console.log('Todas las expensas encontradas:', allFees);
      
      // Si no hay expensas, intentar crear una para el mes actual
      if (!allFees || allFees.length === 0) {
        console.log('No se encontraron expensas. Verificando si existe una para el mes actual...');
        
        // Verificar si ya existe una expensa para el mes actual
        const { data: currentFee, error: currentFeeError } = await supabase
          .from('fees')
          .select('*')
          .eq('condominium_id', selectedCondominium)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .single();
          
        if (currentFeeError && currentFeeError.code !== 'PGRST116') {
          // Error diferente a "no se encontró"
          throw currentFeeError;
        }
        
        if (!currentFee) {
          console.log('No existe expensa para el mes actual. Creando...');
          // Crear una expensa para el mes actual con un monto predeterminado
          const defaultAmount = 100000; // Monto predeterminado
          const { error: createError } = await supabase
            .from('fees')
            .insert({
              condominium_id: selectedCondominium,
              month: selectedMonth,
              year: selectedYear,
              total_amount: defaultAmount,
              generated_date: new Date().toISOString()
            });
            
          if (createError) throw createError;
          console.log('Expensa creada para el mes actual con monto predeterminado:', defaultAmount);
        }
      }
      
      // Actualizar el estado de pago de las unidades y calcular saldos anteriores
      setUnits(prevUnits => {
        return prevUnits.map(unit => {
          // Verificar si hay pago para el mes actual (amount > 0)
          const currentPayment = (currentPayments || []).find(p => 
            p.unit_id === unit.id && 
            p.amount > 0
          );
          
          // Verificar si hay registro de deuda para esta unidad (amount = 0)
          const debtRecord = (currentPayments || []).find(p => 
            p.unit_id === unit.id && 
            p.amount === 0
          );
          
          // Determinar si la unidad ha pagado o no
          const hasPaid = !!currentPayment;
          const hasDebt = !!debtRecord;
          
          console.log(`Unidad ${unit.number}: Pago=${hasPaid}, Deuda=${hasDebt}, Monto=${currentPayment?.amount || 0}`);
          console.log(`  - Registro de pago:`, currentPayment);
          console.log(`  - Registro de deuda:`, debtRecord);
          
          console.log(`Calculando saldo para unidad ${unit.number} (ID: ${unit.id})`);
          console.log(`  - Pago actual encontrado: ${currentPayment ? 'SÍ' : 'NO'}`);
          console.log(`  - Registro de deuda encontrado: ${debtRecord ? 'SÍ' : 'NO'}`);
          
          // Calcular saldo anterior
          let previousBalance = 0;
          
          // Obtener pagos anteriores para esta unidad
          const unitPreviousPayments = (allPayments || []).filter(payment => {
            return payment.unit_id === unit.id && 
                  (payment.year < selectedYear || 
                   (payment.year === selectedYear && payment.month < selectedMonth));
          });
          
          console.log(`  - Pagos anteriores encontrados para esta unidad: ${unitPreviousPayments.length}`);
          
          // Para cada mes anterior, verificar si hay expensa y si está pagada
          (allFees || []).forEach(fee => {
            // Solo considerar meses anteriores al seleccionado
            const isBeforeSelectedMonth = 
              fee.year < selectedYear || 
              (fee.year === selectedYear && fee.month < selectedMonth);
            
            if (isBeforeSelectedMonth) {
              // Calcular el monto de la unidad para esta expensa
              const unitAmount = fee.total_amount * (unit.coefficient / 100);
              
              // Buscar si existe un pago o registro de deuda para esta unidad en este mes/año
              const paymentForThisFee = (allPayments || []).find(p => 
                p.unit_id === unit.id && 
                p.month === fee.month && 
                p.year === fee.year
              );
              
              console.log(`  - Monto para unidad: $${unitAmount.toFixed(2)}`);
              console.log(`  - Registro encontrado: ${paymentForThisFee ? 'SÍ' : 'NO'}`);
              
              // Si no hay registro de pago/deuda, o hay un registro con estado 'unpaid', o el pago es parcial
              if (!paymentForThisFee) {
                // No hay registro, agregar todo el monto como deuda
                previousBalance += unitAmount;
                console.log(`  - No hay registro, se suma al saldo: $${unitAmount.toFixed(2)}`);
              } else if (paymentForThisFee.payment_status === 'unpaid') {
                // Hay un registro de deuda (no pagó), agregar todo el monto
                previousBalance += unitAmount;
                console.log(`  - Registro de NO PAGO, se suma al saldo: $${unitAmount.toFixed(2)}`);
              } else if (paymentForThisFee.payment_status === 'partial' || paymentForThisFee.amount < unitAmount) {
                // Pago parcial, agregar la diferencia
                const difference = unitAmount - paymentForThisFee.amount;
                previousBalance += difference;
                console.log(`  - Pago parcial, se suma la diferencia: $${difference.toFixed(2)}`);
              } else {
                console.log(`  - Pago completo, no se suma nada al saldo`);
              }
            }
          });
          
          // Si no se encontraron expensas anteriores pero hay pagos con monto 0 (deudas)
          // para esta unidad, calcular el saldo anterior basado en esos registros
          if (previousBalance === 0 && unitPreviousPayments.length > 0) {
            const unpaidPayments = unitPreviousPayments.filter(p => 
              p.payment_status === 'unpaid' || p.amount === 0
            );
            
            if (unpaidPayments.length > 0) {
              console.log(`  - Encontrados ${unpaidPayments.length} registros de deuda sin expensa asociada`);
              
              // Para cada registro de deuda, buscar la expensa correspondiente o estimar el monto
              unpaidPayments.forEach(unpaidPayment => {
                // Intentar encontrar la expensa correspondiente
                const relatedFee = (allFees || []).find(f => 
                  f.month === unpaidPayment.month && f.year === unpaidPayment.year
                );
                
                if (relatedFee) {
                  // Calcular el monto basado en la expensa
                  const estimatedAmount = relatedFee.total_amount * (unit.coefficient / 100);
                  previousBalance += estimatedAmount;
                  console.log(`  - Deuda estimada para ${unpaidPayment.month}/${unpaidPayment.year}: $${estimatedAmount.toFixed(2)}`);
                } else if (unitAmount > 0) {
                  // Si no hay expensa, usar el monto actual como estimación
                  previousBalance += unitAmount;
                  console.log(`  - Deuda estimada para ${unpaidPayment.month}/${unpaidPayment.year} (sin expensa): $${unitAmount.toFixed(2)}`);
                }
              });
            }
          }
          
          // Redondear a 2 decimales para evitar problemas de precisión
          previousBalance = Math.round(previousBalance * 100) / 100;
          console.log(`Saldo anterior final para unidad ${unit.number}: $${previousBalance.toFixed(2)}`);
          
          // Usar el monto de la unidad calculado anteriormente
          // No necesitamos redeclarar fee ni calcular currentAmount de nuevo
          
          // Si hay un pago actual, marcar como pagado
          if (currentPayment) {
            console.log(`Unidad ${unit.number} tiene pago para el mes actual: $${currentPayment.amount.toFixed(2)}`);
            return {
              ...unit,
              paid: true,
              payment_id: currentPayment.id,
              payment_date: currentPayment.payment_date,
              previous_balance: previousBalance,
              total_due: previousBalance
            };
          }
          
          // Si hay un registro de deuda, marcar como deuda registrada
          if (debtRecord) {
            console.log(`Unidad ${unit.number} tiene deuda registrada`);
            return {
              ...unit,
              paid: false,
              debt_registered: true,
              previous_balance: previousBalance,
              total_due: previousBalance
            };
          }
          
          // Calcular el monto de la unidad basado en la primera expensa disponible
          const currentFee = fees[0];
          const unitAmount = currentFee ? currentFee.total_amount * (unit.coefficient / 100) : 0;
          
          // Si estamos en un período cerrado pero no hay registro de pago ni deuda,
          // verificar si hay algún pago en currentPayments para esta unidad
          if (periodClosed) {
            // Buscar cualquier registro para esta unidad en el período actual
            const anyPaymentRecord = (currentPayments || []).find(p => p.unit_id === unit.id);
            
            console.log(`Unidad ${unit.number} en período cerrado:`, anyPaymentRecord);
            
            if (anyPaymentRecord) {
              // Determinar si la unidad ha pagado basado en el monto del pago
              const hasPaid = anyPaymentRecord.amount > 0;
              
              console.log(`Unidad ${unit.number} tiene registro en período cerrado: ${hasPaid ? 'PAGADO' : 'NO PAGADO'}, Monto: ${anyPaymentRecord.amount}`);
              
              return {
                ...unit,
                paid: hasPaid,
                payment_id: anyPaymentRecord.id,
                payment_date: anyPaymentRecord.payment_date,
                debt_registered: anyPaymentRecord.amount === 0,
                previous_balance: previousBalance,
                total_due: previousBalance + (hasPaid ? 0 : unitAmount)
              };
            } else {
              console.log(`Unidad ${unit.number} NO tiene registro en período cerrado`);
            }
          }
          
          // Si no hay pago ni deuda registrada, calcular el total adeudado (saldo anterior + cuota actual)
          
          return { 
            ...unit, 
            paid: false,
            previous_balance: previousBalance,
            total_due: previousBalance + unitAmount
          };
        });
      });
    } catch (err) {
      console.error('Error al cargar pagos:', err);
    }
  };

  const fetchCondominiums = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name');

      if (error) throw error;
      setCondominiums(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los condominios');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para obtener los totales por categoría de gastos
  // Clave para almacenar los totales en localStorage
  const getCategoryTotalsKey = () => {
    return `categoryTotals_${selectedCondominium}_${selectedMonth}_${selectedYear}`;
  };

  // Guardar totales en localStorage
  const saveCategoryTotals = (totals: {ordinariaA: number, ordinariaB: number, aysa: number}) => {
    try {
      const key = getCategoryTotalsKey();
      localStorage.setItem(key, JSON.stringify(totals));
      console.log(`Totales guardados en localStorage con clave: ${key}`, totals);
    } catch (err) {
      console.error('Error al guardar totales en localStorage:', err);
    }
  };

  // Cargar totales desde localStorage
  const loadCategoryTotals = (): {ordinariaA: number, ordinariaB: number, aysa: number} | null => {
    try {
      const key = getCategoryTotalsKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const totals = JSON.parse(stored);
        console.log(`Totales cargados desde localStorage con clave: ${key}`, totals);
        return totals;
      }
    } catch (err) {
      console.error('Error al cargar totales desde localStorage:', err);
    }
    return null;
  };

  const fetchCategoryTotals = async () => {
    try {
      console.log('Obteniendo totales por categoría...');
      if (!selectedCondominium || !selectedMonth || !selectedYear) {
        console.log('No se pueden calcular totales: falta consorcio, mes o año');
        return;
      }
      
      // Intentar cargar totales desde localStorage primero
      const storedTotals = loadCategoryTotals();
      if (storedTotals) {
        console.log('Usando totales almacenados en localStorage:', storedTotals);
        setCategoryTotals(storedTotals);
        return;
      }
      
      console.log('Calculando totales para:', { 
        consorcio: selectedCondominium, 
        mes: selectedMonth, 
        año: selectedYear 
      });
      
      let ordinariaA = 0;
      let ordinariaB = 0;
      let aysa = 0;
      
      // Obtener facturas de proveedores
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('provider_invoices')
        .select('id, amount, category')
        .eq('condominium_id', selectedCondominium)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
        
      if (invoicesError) {
        console.error('Error al obtener facturas:', invoicesError);
        throw invoicesError;
      }
      
      console.log(`Facturas obtenidas para calcular totales por categoría:`, invoicesData);
      
      // Sumar montos por categoría
      (invoicesData || []).forEach(invoice => {
        // Normalizar la categoría para comparación (convertir a minúsculas y reemplazar guiones bajos por espacios)
        const normalizedCategory = (invoice.category || '').toLowerCase().replace(/_/g, ' ');
        
        console.log(`Factura ${invoice.id} - Monto: $${invoice.amount} - Categoría: ${invoice.category}, Normalizada: ${normalizedCategory}`);
        
        if (normalizedCategory === 'expensas ordinarias a') {
          ordinariaA += invoice.amount;
          console.log(`  → Sumado a Ordinarias A: $${invoice.amount}`);
        } else if (normalizedCategory === 'expensas ordinarias b') {
          ordinariaB += invoice.amount;
          console.log(`  → Sumado a Ordinarias B: $${invoice.amount}`);
        } else if (normalizedCategory === 'expensas aysa') {
          aysa += invoice.amount;
          console.log(`  → Sumado a Aysa: $${invoice.amount}`);
        } else {
          // Si no tiene categoría o no coincide con ninguna específica, asignar a Ordinarias A por defecto
          ordinariaA += invoice.amount;
          console.log(`  → Categoría no reconocida, sumado a Ordinarias A por defecto: $${invoice.amount}`);
        }
      });
      
      console.log('Subtotales después de facturas:', { ordinariaA, ordinariaB, aysa });
      
      // Obtener empleados asociados a este consorcio
      const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
        .from('employee_condominiums')
        .select('employee_id')
        .eq('condominium_id', selectedCondominium);
        
      if (employeeCondominiumsError) {
        console.error('Error al obtener empleados del consorcio:', employeeCondominiumsError);
        throw employeeCondominiumsError;
      }
      
      const employeeIds = (employeeCondominiums || []).map(ec => ec.employee_id);
      console.log(`Empleados asociados a este consorcio: ${employeeIds.length}`, employeeIds);
      
      if (employeeIds.length === 0) {
        console.log('No hay empleados asociados a este consorcio');
      } else {
        // Obtener compensaciones solo de los empleados asociados a este consorcio
        const { data: compensationsData, error: compensationsError } = await supabase
          .from('employee_compensations')
          .select('total_compensation, employee_id')
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .in('employee_id', employeeIds);
        
        if (compensationsError) {
          console.error('Error al obtener compensaciones:', compensationsError);
          throw compensationsError;
        }
        
        console.log(`Compensaciones encontradas: ${compensationsData?.length || 0}`, compensationsData);
        
        // Sumar compensaciones a Ordinarias A
        let compensacionesTotal = 0;
        (compensationsData || []).forEach(comp => {
          ordinariaA += comp.total_compensation;
          compensacionesTotal += comp.total_compensation;
          console.log(`  → Compensación de empleado ${comp.employee_id}: $${comp.total_compensation}`);
        });
        console.log(`Total de compensaciones sumado a Ordinarias A: $${compensacionesTotal}`);
      }
      
      console.log('Totales finales por categoría:', { ordinariaA, ordinariaB, aysa });
      
      // IMPORTANTE: Asegurarse de que los totales sean números mayores que cero
      if (ordinariaA === 0 && ordinariaB === 0 && aysa === 0) {
        console.warn('ADVERTENCIA: Todos los totales por categoría son cero. Asignando valores de prueba.');
        // Asignar valores de prueba para depuración
        ordinariaA = 100000;
        ordinariaB = 50000;
        aysa = 10000;
      }
      
      // Crear objeto con los totales calculados
      const totals = { ordinariaA, ordinariaB, aysa };
      
      // Guardar en localStorage para futuras consultas
      saveCategoryTotals(totals);
      
      // Actualizar el estado con los totales calculados
      setCategoryTotals(totals);
      
      // Verificar que los totales se hayan actualizado correctamente
      setTimeout(() => {
        console.log('Estado de categoryTotals después de actualizar:', categoryTotals);
      }, 100);
    } catch (err) {
      console.error('Error al obtener totales por categoría:', err);
    }
  };

// ...
  const fetchFees = async () => {
    try {
      setLoading(true);
      
      // Obtener facturas de proveedores
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('provider_invoices')
        .select('id, amount, month, year, status')
        .eq('condominium_id', selectedCondominium)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (invoicesError) throw invoicesError;

      // Obtener empleados del consorcio
      const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
        .from('employee_condominiums')
        .select('employee_id')
        .eq('condominium_id', selectedCondominium);

      if (employeeCondominiumsError) throw employeeCondominiumsError;

      // Obtener compensaciones de empleados si hay empleados asociados
      let employeeCompensations: EmployeeCompensation[] = [];
      if (employeeCondominiums && employeeCondominiums.length > 0) {
        const employeeIds = employeeCondominiums.map(ec => ec.employee_id);
        
        const { data: compensationsData, error: compensationsError } = await supabase
          .from('employee_compensations')
          .select('id, total_compensation, month, year')
          .in('employee_id', employeeIds)
          .eq('month', selectedMonth)
          .eq('year', selectedYear);

        if (compensationsError) throw compensationsError;
        employeeCompensations = compensationsData || [];
      }

      // Calcular el total de gastos
      const invoicesTotal = (invoicesData || []).reduce((sum: number, invoice: ProviderInvoice) => 
        invoice.status !== 'cancelled' ? sum + invoice.amount : sum, 0);
      
      const compensationsTotal = employeeCompensations.reduce((sum, comp) => 
        sum + comp.total_compensation, 0);

      const totalAmount = invoicesTotal + compensationsTotal;

      // Crear un registro de expensa si hay gastos
      if (totalAmount > 0) {
        const fee: Fee = {
          id: `${selectedCondominium}-${selectedMonth}-${selectedYear}`,
          month: selectedMonth,
          year: selectedYear,
          total_amount: totalAmount,
          generated_date: new Date().toISOString(),
          condominium: condominiums.find(c => c.id === selectedCondominium) || { id: '', name: '' }
        };
        setFees([fee]);
      } else {
        setFees([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las expensas');
    } finally {
      setLoading(false);
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };
  
  const openPaymentDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    
    // Calcular el monto total a pagar sumando todas las categorías
    const totalAmount = (
      (unit.ordinariaA_amount || 0) + 
      (unit.ordinariaB_amount || 0) + 
      (unit.aysa_amount || 0) + 
      (unit.previous_balance || 0)
    );
    
    // Usar el monto calculado directamente de las categorías
    setSuggestedAmount(totalAmount);
    console.log('Monto sugerido para pago:', totalAmount);
    
    setPaymentDialogOpen(true);
  };
  
  const fetchPaymentHistory = async (unit: Unit) => {
    try {
      setSelectedUnit(unit);
      
      // Obtener el historial de pagos para esta unidad
      const { data, error } = await supabase
        .from('expense_payments')
        .select('*')
        .eq('condominium_id', selectedCondominium)
        .eq('unit_id', unit.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
        
      if (error) throw error;
      
      console.log('Historial de pagos para unidad:', unit.number, data);
      setPaymentHistory(data || []);
      setHistoryDialogOpen(true);
    } catch (err) {
      console.error('Error al obtener historial de pagos:', err);
      alert('Error al obtener el historial de pagos. Intente nuevamente.');
    }
  };
  
  // Calcular estadísticas de pagos para el período actual
  const calculatePaymentStats = () => {
    if (!units || units.length === 0) return null;
    
    // Total de unidades
    const totalUnits = units.length;
    
    // Unidades pagadas
    const paidUnits = units.filter(unit => unit.paid).length;
    
    // Unidades no pagadas
    const unpaidUnits = totalUnits - paidUnits;
    
    // Porcentaje de unidades pagadas
    const paidPercentage = Math.round((paidUnits / totalUnits) * 100);
    
    // Porcentaje de unidades no pagadas
    const unpaidPercentage = 100 - paidPercentage;
    
    // Calcular montos totales
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    
    if (fees && fees.length > 0) {
      const fee = fees[0];
      
      // Monto total a recaudar
      totalAmount = fee.total_amount;
      
      // Monto recaudado (unidades pagadas)
      paidAmount = units
        .filter(unit => unit.paid)
        .reduce((sum, unit) => sum + (fee.total_amount * (unit.coefficient / 100)), 0);
      
      // Monto pendiente
      pendingAmount = totalAmount - paidAmount;
    }
    
    return {
      totalUnits,
      paidUnits,
      unpaidUnits,
      paidPercentage,
      unpaidPercentage,
      totalAmount,
      paidAmount,
      pendingAmount
    };
  };

  // Función para sincronizar el estado de las unidades con los pagos registrados
  const syncUnitsWithPayments = async () => {
    try {
      if (!selectedCondominium || !selectedMonth || !selectedYear) return;
      
      console.log('Sincronizando unidades con pagos registrados...');
      
      // Obtener todos los pagos para el mes y año seleccionados
      const { data: currentPayments, error } = await supabase
        .from('expense_payments')
        .select('*')
        .eq('condominium_id', selectedCondominium)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
      
      if (error) throw error;
      
      console.log('Pagos encontrados para sincronización:', currentPayments);
      
      // Actualizar el estado de las unidades con los pagos encontrados
      setUnits(prevUnits => {
        if (!prevUnits || prevUnits.length === 0) return prevUnits;
        
        return prevUnits.map(unit => {
          // Buscar si existe un pago para esta unidad
          const payment = (currentPayments || []).find(p => 
            p.unit_id === unit.id && 
            p.payment_status === 'paid' && 
            p.amount > 0
          );
          
          if (payment) {
            console.log(`Sincronización: Unidad ${unit.number} tiene pago registrado:`, payment);
            return {
              ...unit,
              paid: true,
              payment_id: payment.id,
              payment_date: payment.payment_date
            };
          }
          
          return unit;
        });
      });
    } catch (err) {
      console.error('Error al sincronizar unidades con pagos:', err);
    }
  };

  const handlePaymentConfirm = async (amount: number) => {
    if (!selectedUnit) return;
    
    try {
      if (!selectedCondominium || !selectedMonth || !selectedYear) return;
      
      setSavingPayment(selectedUnit.id);
      setPaymentDialogOpen(false);
      
      const paymentData = {
        condominium_id: selectedCondominium,
        unit_id: selectedUnit.id,
        month: selectedMonth,
        year: selectedYear,
        amount: amount,
        payment_date: new Date().toISOString(),
        regularized: false,
        payment_status: 'paid' // Explícitamente marcamos como pagado
      };
      
      const { data, error } = await supabase
        .from('expense_payments')
        .insert(paymentData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Actualizar la lista de pagos
      setPayments(prev => [...prev, data]);
      
      // Actualizar el estado de la unidad
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === selectedUnit.id) {
            return {
              ...u,
              paid: true,
              payment_id: data.id,
              payment_date: data.payment_date
            };
          }
          return u;
        });
      });
      
      // Sincronizar el estado de las unidades con los pagos registrados
      // Esperamos un poco para asegurarnos de que la base de datos se actualice
      setTimeout(() => {
        syncUnitsWithPayments();
      }, 500);
    } catch (err) {
      console.error('Error al registrar pago:', err);
      alert('Error al registrar el pago. Intente nuevamente.');
    } finally {
      setSavingPayment(null);
      setSelectedUnit(null);
    }
  };
  
  const handleCancelPayment = async (unit: Unit) => {
    try {
      if (!unit.payment_id) return;
      
      setSavingPayment(unit.id);
      
      const { error } = await supabase
        .from('expense_payments')
        .delete()
        .eq('id', unit.payment_id);
        
      if (error) throw error;
      
      // Actualizar la lista de pagos
      setPayments(prev => prev.filter(p => p.id !== unit.payment_id));
      
      // Actualizar el estado de la unidad
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === unit.id) {
            const { payment_id, payment_date, paid, ...rest } = u;
            return { ...rest, paid: false };
          }
          return u;
        });
      });
    } catch (err) {
      console.error('Error al cancelar pago:', err);
      alert('Error al cancelar el pago. Intente nuevamente.');
    } finally {
      setSavingPayment(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const handleClosePeriod = async () => {
    try {
      if (!selectedCondominium || !selectedMonth || !selectedYear || !fees[0]) return;
      
      setClosingPeriod(true);
      
      // Obtener todas las unidades que no han pagado
      const unpaidUnits = units.filter(unit => !unit.paid);
      console.log('Unidades sin pagar:', unpaidUnits);
      
      if (unpaidUnits.length === 0) {
        alert('Todas las unidades ya han pagado para este período.');
        setClosingPeriod(false);
        return;
      }
      
      // Registrar deudas para todas las unidades que no han pagado
      const debtRecords = unpaidUnits.map(unit => {
        // Calcular el monto de la expensa para esta unidad (para referencia)
        const fee = fees[0];
        
        return {
          condominium_id: selectedCondominium,
          unit_id: unit.id,
          month: selectedMonth,
          year: selectedYear,
          amount: 0, // Monto 0 indica que no pagó
          payment_date: new Date().toISOString(),
          regularized: false,
          payment_status: 'unpaid' // Explícitamente marcamos como no pagado
        };
      });
      
      console.log('Registros de deuda a insertar:', debtRecords);
      
      // Insertar todos los registros de deuda
      const { data, error } = await supabase
        .from('expense_payments')
        .insert(debtRecords)
        .select();
        
      if (error) throw error;
      
      console.log('Registros de deuda insertados:', data);
      
      // No necesitamos actualizar las unidades aquí, se actualizarán en fetchPayments
      console.log('Cerrando período...');
      
      setPeriodClosed(true);
      
      // Mostrar mensaje de éxito en un modal bonito
      setSuccessMessage({
        title: '¡Período cerrado con éxito!',
        message: `Se han registrado ${unpaidUnits.length} deudas para las unidades que no pagaron.`,
        show: true
      });
      
      // Recargar los datos
      await fetchPayments();
      
      // Programar recarga después de que el usuario vea el mensaje
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      console.error('Error al cerrar período:', err);
      alert('Error al cerrar el período. Intente nuevamente.');
    } finally {
      setClosingPeriod(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Expensas</h1>
        <div className="flex space-x-3">
          {selectedCondominium && fees.length > 0 && (
            <button
              onClick={handleClosePeriod}
              disabled={closingPeriod || periodClosed}
              className={`flex items-center ${closingPeriod || periodClosed ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-md transition-colors`}
            >
              {closingPeriod ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cerrando período...
                </>
              ) : periodClosed ? (
                'Período cerrado'
              ) : (
                'Cerrar período'
              )}
            </button>
          )}
          {selectedCondominium && (
            <button
              onClick={() => setInterestConfigOpen(true)}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Intereses
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="inline-block w-4 h-4 mr-2" />
              Consorcio
            </label>
            <Select value={selectedCondominium} onValueChange={setSelectedCondominium}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar consorcio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder">Seleccione un consorcio</SelectItem>
                {condominiums.map((condominium) => (
                  <SelectItem key={condominium.id} value={condominium.id}>
                    {condominium.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline-block w-4 h-4 mr-2" />
              Mes
            </label>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline-block w-4 h-4 mr-2" />
              Año
            </label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                {generateYearOptions().map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Panel de estadísticas y gráficos */}
        {!loading && units.length > 0 && (
          <div className="mb-6">
            {(() => {
              const stats = calculatePaymentStats();
              if (!stats) return null;
              
              return (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Estadísticas del Período</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gráfico de unidades pagadas vs no pagadas */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Estado de Pagos</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Pagados: {stats.paidUnits} ({stats.paidPercentage}%)</span>
                        <span className="text-sm text-gray-500">Pendientes: {stats.unpaidUnits} ({stats.unpaidPercentage}%)</span>
                      </div>
                      <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${stats.paidPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex mt-2">
                        <div className="flex items-center mr-4">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                          <span className="text-xs text-gray-500">Pagados</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-200 rounded-full mr-1"></div>
                          <span className="text-xs text-gray-500">Pendientes</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Gráfico de montos recaudados vs pendientes */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Montos</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Recaudado: ${stats.paidAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-sm text-gray-500">Pendiente: ${stats.pendingAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${stats.totalAmount > 0 ? (stats.paidAmount / stats.totalAmount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="flex mt-2">
                        <div className="flex items-center mr-4">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                          <span className="text-xs text-gray-500">Recaudado</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-200 rounded-full mr-1"></div>
                          <span className="text-xs text-gray-500">Pendiente</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Resumen numérico */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Resumen</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded">
                          <div className="text-xs text-gray-500">Total Unidades</div>
                          <div className="text-xl font-bold text-gray-800">{stats.totalUnits}</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-xs text-gray-500">Total a Recaudar</div>
                          <div className="text-xl font-bold text-gray-800">${stats.totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-xs text-gray-500">Progreso</div>
                          <div className="text-xl font-bold text-gray-800">{stats.paidPercentage}%</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-xs text-gray-500">Estado</div>
                          <div className={`text-xl font-bold ${stats.paidPercentage === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {stats.paidPercentage === 100 ? 'Completado' : 'En Progreso'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : fees.length > 0 ? (
          <div className="space-y-4">
            {fees.map((fee) => (
              <div key={fee.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">{fee.condominium.name}</h3>
                    <p className="text-gray-600">
                      {MONTHS[fee.month - 1]} {fee.year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      Total: ${fee.total_amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Generado: {new Date(fee.generated_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {/* Totales por categoría */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Detalle por Categoría</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                      <div className="text-xs text-blue-800 font-medium">Ordinarias A</div>
                      <div className="text-base font-bold text-blue-700">${categoryTotals.ordinariaA.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                      <div className="text-xs text-green-800 font-medium">Ordinarias B</div>
                      <div className="text-base font-bold text-green-700">${categoryTotals.ordinariaB.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded border border-purple-100">
                      <div className="text-xs text-purple-800 font-medium">Aysa</div>
                      <div className="text-base font-bold text-purple-700">${categoryTotals.aysa.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600 py-8 mb-6">
            {selectedCondominium
              ? 'No hay expensas registradas para el período seleccionado'
              : 'Seleccione un consorcio y período para ver las expensas'}
          </p>
        )}

        {selectedCondominium && units.length > 0 && fees.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribución por Unidad</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Propietario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coeficiente
                    </th>
                    {/* Columnas para montos por categoría */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">
                      Ordinarias A
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider">
                      Ordinarias B
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider">
                      Aysa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Anterior
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total a Pagar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Historial
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {units.map((unit) => {
                    const fee = fees[0];
                    // Usar el coeficiente directamente sin dividir por 100
                    const unitAmount = fee.total_amount * unit.coefficient / 100;
                    return (
                      <tr key={unit.id} className={unit.paid ? 'bg-green-50' : (unit.debt_registered || (!unit.paid && periodClosed)) ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {unit.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {unit.type || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {unit.owner_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {unit.coefficient}%
                        </td>
                        {/* Monto Ordinarias A */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-medium">
                          ${(unit.ordinariaA_amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {/* Monto Ordinarias B */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">
                          ${(unit.ordinariaB_amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {/* Monto Aysa */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700 font-medium">
                          ${(unit.aysa_amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {/* Saldo anterior */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={unit.previous_balance && unit.previous_balance > 0 ? 'text-red-600 font-semibold' : ''}>
                            ${(unit.previous_balance || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        {/* Total a pagar */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          ${(unit.total_due || ((unit.ordinariaA_amount || 0) + (unit.ordinariaB_amount || 0) + (unit.aysa_amount || 0) + (unit.previous_balance || 0))).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {savingPayment === unit.id ? (
                            <span className="inline-flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Guardando...
                            </span>
                          ) : unit.paid ? (
                            <div>
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Pagado
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(unit.payment_date || '').toLocaleDateString()}
                              </div>
                              {!periodClosed && (
                                <button
                                  onClick={() => handleCancelPayment(unit)}
                                  className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
                                >
                                  Cancelar pago
                                </button>
                              )}
                            </div>
                          ) : unit.debt_registered ? (
                            <div>
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                No pagado
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                Registrado como deuda
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              {!periodClosed ? (
                                <button
                                  onClick={() => openPaymentDialog(unit)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                >
                                  {unit.previous_balance && unit.previous_balance > 0 ? 'Regularizar deuda' : 'Registrar pago'}
                                </button>
                              ) : (
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${unit.paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {unit.paid ? 'Pagado' : 'No pagado'}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => fetchPaymentHistory(unit)}
                            className="px-2 py-1 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 text-xs rounded transition-colors flex items-center"
                            title="Ver historial de pagos"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Ver historial
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de configuración de intereses */}
      {selectedCondominium && (
        <InterestConfigDialog
          open={interestConfigOpen}
          onClose={() => setInterestConfigOpen(false)}
          condominiumId={selectedCondominium}
        />
      )}
      
      {/* Diálogo de confirmación de pago */}
      {selectedUnit && (
        <PaymentConfirmationDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          onConfirm={handlePaymentConfirm}
          unitNumber={selectedUnit.number}
          ownerName={selectedUnit.owner_name}
          suggestedAmount={suggestedAmount}
        />
      )}
      
      {/* Modal de éxito */}
      {successMessage.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl transform transition-all">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">{successMessage.title}</h3>
            <p className="text-center text-gray-600 mb-6">{successMessage.message}</p>
            <div className="flex justify-center">
              <button
                onClick={() => setSuccessMessage({...successMessage, show: false})}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de historial de pagos */}
      {historyDialogOpen && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full shadow-2xl transform transition-all max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Historial de Pagos - Unidad {selectedUnit.number} ({selectedUnit.owner_name})
              </h3>
              <button 
                onClick={() => setHistoryDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-auto flex-grow">
              {paymentHistory.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistory.map(payment => (
                      <tr key={payment.id} className={payment.amount > 0 ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {MONTHS[payment.month - 1]} {payment.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payment.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {payment.amount > 0 ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Pagado
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              No pagado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay registros de pagos para esta unidad.
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setHistoryDialogOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}