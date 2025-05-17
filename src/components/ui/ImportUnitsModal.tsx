import { Fragment, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Upload, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { read, utils } from 'xlsx';
import Button from './Button';

interface ImportUnitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (units: any[]) => void;
}

interface ValidationResult {
  isValid: boolean;
  totalCoefficient: number;
  message: string;
}

export default function ImportUnitsModal({ isOpen, onClose, onImport }: ImportUnitsModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processedData, setProcessedData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateCoefficients = (data: any[]): ValidationResult => {
    const totalCoefficient = data.reduce((sum, row) => sum + row.coefficient, 0);
    const isValid = Math.abs(totalCoefficient - 100) < 0.000001; // Using small epsilon for floating point comparison

    return {
      isValid,
      totalCoefficient,
      message: isValid 
        ? 'Los coeficientes suman 100% correctamente'
        : `Los coeficientes suman ${totalCoefficient.toFixed(6)}%. ${totalCoefficient < 100 
            ? `Falta ${(100 - totalCoefficient).toFixed(6)}%` 
            : `Excede por ${(totalCoefficient - 100).toFixed(6)}%`}`
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet);

      // Map Excel columns to expected format
      const transformedData = jsonData.map((row: any) => {
        const number = row['Número'] || '';
        const type = row['Tipo'] || '';
        const owner_name = row['Nombre del Propietario'] || '';
        const owner_email = row['Email del Propietario'] || '';
        const owner_phone = row['Teléfono del Propietario'] || '';
        const coefficient = String(row['Coeficiente'] || '0').replace(',', '.');
        
        // Obtener las categorías de expensas
        const expensasA = row['Expensas Ordinarias A'] === 'SI' || row['Expensas Ordinarias A'] === true;
        const expensasB = row['Expensas Ordinarias B'] === 'SI' || row['Expensas Ordinarias B'] === true;
        const expensasAysa = row['Expensas Aysa'] === 'SI' || row['Expensas Aysa'] === true;
        
        // Crear el array de categorías según los valores
        const expense_categories = [];
        if (expensasA) expense_categories.push('expensas_ordinarias_a');
        if (expensasB) expense_categories.push('expensas_ordinarias_b');
        if (expensasAysa) expense_categories.push('expensas_aysa');

        if (!number || !owner_name || !coefficient) {
          throw new Error('Todas las unidades deben tener número, propietario y coeficiente');
        }
        
        // Si no se seleccionó ninguna categoría, asignar valores predeterminados según el tipo
        if (expense_categories.length === 0) {
          expense_categories.push('expensas_ordinarias_a', 'expensas_aysa');
          if (String(type).trim().toLowerCase().includes('departamento') || String(type).trim() === '4') {
            expense_categories.push('expensas_ordinarias_b');
          }
        }

        return {
          number: String(number).trim(),
          type: String(type).trim(),
          owner_name: String(owner_name).trim(),
          owner_email: String(owner_email).trim(),
          owner_phone: String(owner_phone).trim(),
          area: 50, // Default value as per example
          coefficient: parseFloat(coefficient),
          expense_categories: expense_categories
        };
      });

      const validation = validateCoefficients(transformedData);
      setValidationResult(validation);
      setProcessedData(transformedData);
      
      if (!validation.isValid) {
        setError(validation.message);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
      setValidationResult(null);
      setProcessedData(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (processedData && validationResult?.isValid) {
      onImport(processedData);
      setShowSuccessModal(true);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    onClose();
    setProcessedData(null);
    setValidationResult(null);
    setError(null);
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    Importar Unidades desde Excel
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Title>

                  <div className="mt-4">
                    <div className="mt-4 text-sm text-gray-600">
                      <p>La plantilla debe tener las siguientes columnas:</p>
                      <ul className="list-disc pl-5 mt-2">
                        <li><strong>Número</strong>: Número de unidad (obligatorio)</li>
                        <li><strong>Tipo</strong>: Tipo de unidad (ej. Departamento, Cochera, etc.)</li>
                        <li><strong>Nombre del Propietario</strong>: Nombre completo del propietario (obligatorio)</li>
                        <li><strong>Email del Propietario</strong>: Correo electrónico del propietario</li>
                        <li><strong>Teléfono del Propietario</strong>: Número de teléfono del propietario</li>
                        <li><strong>Coeficiente</strong>: Coeficiente de la unidad (obligatorio, debe sumar 100% entre todas las unidades)</li>
                        <li><strong>Expensas Ordinarias A</strong>: Escribir "SI" para incluir esta categoría</li>
                        <li><strong>Expensas Ordinarias B</strong>: Escribir "SI" para incluir esta categoría</li>
                        <li><strong>Expensas Aysa</strong>: Escribir "SI" para incluir esta categoría</li>
                      </ul>
                      <p className="mt-2"><a href="/plantilla_importacion_unidades.xlsx" download className="text-primary-600 hover:text-primary-800 underline">Descargar plantilla de ejemplo</a></p>
                    </div>
                    {error && (
                      <div className="mb-4 p-3 bg-danger-50 border border-danger-200 text-danger-700 rounded-md text-sm flex items-start">
                        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 text-danger-400" />
                        <span>{error}</span>
                      </div>
                    )}

                    {validationResult && !error && (
                      <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 rounded-md text-sm flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 text-success-400" />
                        <span>{validationResult.message}</span>
                      </div>
                    )}

                    <div className="mt-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-medium
                          file:bg-primary-50 file:text-primary-700
                          hover:file:bg-primary-100
                          cursor-pointer"
                      />
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="mr-2"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleConfirmImport}
                        disabled={!validationResult?.isValid || !processedData}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Unidades
                      </Button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={showSuccessModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleCloseSuccess}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-center mb-4">
                    <CheckCircle className="h-12 w-12 text-success-500" />
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 text-center"
                  >
                    ¡Importación Exitosa!
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 text-center">
                      Las unidades han sido importadas correctamente.
                      Los coeficientes suman exactamente 100%.
                    </p>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button onClick={handleCloseSuccess}>
                      Aceptar
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}