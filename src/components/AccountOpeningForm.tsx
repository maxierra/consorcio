import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Button from './ui/Button';
import Input from './ui/Input';
import { X } from 'lucide-react';

interface AccountOpeningFormProps {
  condominiumId: string;
  balanceToEdit: {
    id: string;
    period_month: number;
    period_year: number;
    initial_balance: number;
    income: number;
    expenses: number;
    final_balance: number;
    status: string;
    notes: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  period_month: number;
  period_year: number;
  initial_balance: string;
  income: string;
  expenses: string;
  final_balance: string;
  status: string;
  notes: string;
}

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'cerrado', label: 'Cerrado' }
];

export default function AccountOpeningForm({ condominiumId, balanceToEdit, onClose, onSuccess }: AccountOpeningFormProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState<FormData>({
    period_month: balanceToEdit?.period_month || currentMonth,
    period_year: balanceToEdit?.period_year || currentYear,
    initial_balance: balanceToEdit ? balanceToEdit.initial_balance.toString() : '0',
    income: balanceToEdit ? balanceToEdit.income.toString() : '0',
    expenses: balanceToEdit ? balanceToEdit.expenses.toString() : '0',
    final_balance: balanceToEdit ? balanceToEdit.final_balance.toString() : '0',
    status: balanceToEdit?.status || 'pendiente',
    notes: balanceToEdit?.notes || ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular automáticamente el saldo final cuando cambian los valores relevantes
  useEffect(() => {
    const initial = parseFloat(formData.initial_balance) || 0;
    const income = parseFloat(formData.income) || 0;
    const expenses = parseFloat(formData.expenses) || 0;
    
    const final = initial + income - expenses;
    setFormData(prev => ({ ...prev, final_balance: final.toFixed(2) }));
  }, [formData.initial_balance, formData.income, formData.expenses]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Para campos numéricos, aseguramos que sean números válidos
    if (['initial_balance', 'income', 'expenses'].includes(name)) {
      // Permitimos números con hasta 2 decimales
      const regex = /^-?\d*\.?\d{0,2}$/;
      if (value === '' || regex.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Eliminamos la función calculateFinalBalance ya que ahora se calcula automáticamente

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Convertir strings a números para los campos numéricos
      const dataToSubmit = {
        condominium_id: condominiumId,
        period_month: parseInt(formData.period_month.toString()),
        period_year: parseInt(formData.period_year.toString()),
        initial_balance: parseFloat(formData.initial_balance) || 0,
        income: parseFloat(formData.income) || 0,
        expenses: parseFloat(formData.expenses) || 0,
        final_balance: parseFloat(formData.final_balance) || 0,
        status: formData.status,
        notes: formData.notes
      };

      let error;

      if (balanceToEdit) {
        // Actualizar balance existente
        const { error: updateError } = await supabase
          .from('condominium_balances')
          .update(dataToSubmit)
          .eq('id', balanceToEdit.id);
        
        error = updateError;
      } else {
        // Insertar nuevo balance
        const { error: insertError } = await supabase
          .from('condominium_balances')
          .insert(dataToSubmit);
        
        error = insertError;
      }

      if (error) throw error;

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {balanceToEdit ? 'Editar Apertura de Cuentas' : 'Nueva Apertura de Cuentas'}
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="period_month" className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <select
              id="period_month"
              name="period_month"
              value={formData.period_month}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              {MONTHS.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="period_year" className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <select
              id="period_year"
              name="period_year"
              value={formData.period_year}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Saldo Inicial"
          name="initial_balance"
          type="text"
          value={formData.initial_balance}
          onChange={handleChange}
          required
        />

        <Input
          label="Ingresos"
          name="income"
          type="text"
          value={formData.income}
          onChange={handleChange}
          required
        />

        <Input
          label="Egresos"
          name="expenses"
          type="text"
          value={formData.expenses}
          onChange={handleChange}
          required
        />

        <div>
          <Input
            label="Saldo Final (calculado automáticamente)"
            name="final_balance"
            type="text"
            value={formData.final_balance}
            readOnly
            required
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            required
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notas
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? 'Guardando...' : balanceToEdit ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
