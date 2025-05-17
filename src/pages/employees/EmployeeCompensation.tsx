import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface CompensationFormData {
  net_salary: string;
  social_security: string;
  union_contribution: string;
  other_deductions: string;
  month: string;
  year: string;
}

interface EmployeeCompensationProps {
  employeeId: string;
  compensationId?: string;
  initialData?: {
    net_salary: number;
    social_security: number;
    union_contribution: number;
    other_deductions: number;
    month: number;
    year: number;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

const months = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

const EmployeeCompensation: React.FC<EmployeeCompensationProps> = ({
  employeeId,
  compensationId,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useAuth();
  const isEditing = !!compensationId;

  const [formData, setFormData] = useState<CompensationFormData>({
    net_salary: initialData?.net_salary.toString() || '',
    social_security: initialData?.social_security.toString() || '',
    union_contribution: initialData?.union_contribution.toString() || '',
    other_deductions: initialData?.other_deductions.toString() || '0',
    month: initialData?.month.toString() || (new Date().getMonth() + 1).toString(),
    year: initialData?.year.toString() || new Date().getFullYear().toString(),
  });

  const calculateTotal = (): number => {
    return (
      parseFloat(formData.net_salary || '0') +
      parseFloat(formData.social_security || '0') +
      parseFloat(formData.union_contribution || '0') -
      parseFloat(formData.other_deductions || '0')
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar que el empleado esté asignado a un consorcio
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee_condominiums')
        .select('condominium_id')
        .eq('employee_id', employeeId)
        .single();

      if (employeeError) throw new Error('No se pudo obtener el consorcio del empleado');
      if (!employeeData) throw new Error('El empleado no está asignado a ningún consorcio');

      const condominiumId = employeeData.condominium_id;
      const totalCompensation = calculateTotal();

      // Crear o actualizar el pago del empleado
      const paymentData = {
        employee_id: employeeId,
        condominium_id: condominiumId,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        base_salary: parseFloat(formData.net_salary || '0'),
        social_security: parseFloat(formData.social_security || '0'),
        union_fee: parseFloat(formData.union_contribution || '0'),
        deductions: parseFloat(formData.other_deductions || '0'),
        total_amount: totalCompensation,
        payment_date: new Date().toISOString().split('T')[0],
        status: 'paid' as const
      };

      // Ya no necesitamos estas variables
      // const monthName = months.find(m => m.value === formData.month)?.label || '';

      if (compensationId) {
        // Actualizar pago existente
        const { error: paymentUpdateError } = await supabase
          .from('employee_payments')
          .update(paymentData)
          .eq('id', compensationId);

        if (paymentUpdateError) throw paymentUpdateError;

        // Actualizar la remuneración existente
        const { error: compUpdateError } = await supabase
          .from('employee_compensations')
          .update({
            net_salary: parseFloat(formData.net_salary || '0'),
            social_security: parseFloat(formData.social_security || '0'),
            union_contribution: parseFloat(formData.union_contribution || '0'),
            other_deductions: parseFloat(formData.other_deductions || '0'),
            total_compensation: totalCompensation,
            month: parseInt(formData.month),
            year: parseInt(formData.year)
          })
          .eq('id', compensationId);

        if (compUpdateError) throw compUpdateError;
      } else {
        // Crear nuevo pago
        const { data: newPayment, error: paymentInsertError } = await supabase
          .from('employee_payments')
          .insert([paymentData])
          .select('id')
          .single();

        if (paymentInsertError) throw paymentInsertError;

        // Crear nueva remuneración
        const { error: compInsertError } = await supabase
          .from('employee_compensations')
          .insert([{
            employee_id: employeeId,
            net_salary: parseFloat(formData.net_salary || '0'),
            social_security: parseFloat(formData.social_security || '0'),
            union_contribution: parseFloat(formData.union_contribution || '0'),
            other_deductions: parseFloat(formData.other_deductions || '0'),
            total_compensation: totalCompensation,
            month: parseInt(formData.month),
            year: parseInt(formData.year)
          }]);

        if (compInsertError) throw compInsertError;
      }

      // Llamar a onSuccess solo si está definido
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error saving employee compensation:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la remuneración. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal().toFixed(2);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        {isEditing ? 'Editar Remuneración' : 'Agregar Remuneración'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <select
              name="month"
              value={formData.month}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <select
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sueldo Neto
            </label>
            <input
              type="number"
              name="net_salary"
              value={formData.net_salary}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seguro Social
            </label>
            <input
              type="number"
              name="social_security"
              value={formData.social_security}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aporte Sindicato
            </label>
            <input
              type="number"
              name="union_contribution"
              value={formData.union_contribution}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Otras Deducciones
            </label>
            <input
              type="number"
              name="other_deductions"
              value={formData.other_deductions}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="md:col-span-2">
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-lg font-semibold">
                Total: ${total}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeCompensation;
