import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import Input from './ui/Input';
import { formatCurrency } from '../lib/utils';

interface BalanceTransactionsProps {
  condominiumId: string;
  balanceId: string;
  onTransactionChange: () => void;
}

interface Transaction {
  id: string;
  balance_id: string;
  condominium_id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  created_at: string;
}

interface FormData {
  date: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
}

const TRANSACTION_CATEGORIES = [
  { value: 'expensas', label: 'Expensas' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'reparaciones', label: 'Reparaciones' },
  { value: 'sueldos', label: 'Sueldos' },
  { value: 'otros', label: 'Otros' }
];

export default function BalanceTransactions({ condominiumId, balanceId, onTransactionChange }: BalanceTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'income',
    category: 'otros'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [condominiumId, balanceId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('balance_id', balanceId)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las transacciones');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Para el campo de monto, aseguramos que sea un número válido
    if (name === 'amount') {
      // Permitimos números con hasta 2 decimales
      const regex = /^-?\d*\.?\d{0,2}$/;
      if (value === '' || regex.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Convertir strings a números para los campos numéricos
      const amount = parseFloat(formData.amount) || 0;
      
      const transactionData = {
        balance_id: balanceId,
        condominium_id: condominiumId,
        date: formData.date,
        description: formData.description,
        amount: amount,
        type: formData.type,
        category: formData.category
      };

      let error;
      
      if (editingTransaction) {
        // Actualizar transacción existente
        const { error: updateError } = await supabase
          .from('balance_transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);
        
        error = updateError;
      } else {
        // Insertar nueva transacción
        const { error: insertError } = await supabase
          .from('balance_transactions')
          .insert(transactionData);
        
        error = insertError;
      }

      if (error) throw error;

      // Actualizar el balance con el nuevo monto
      await updateBalance();

      // Recargar las transacciones y ocultar el formulario
      await fetchTransactions();
      setShowForm(false);
      setEditingTransaction(null);
      resetForm();
      
      // Notificar al componente padre que hubo un cambio en las transacciones
      onTransactionChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la transacción');
    } finally {
      setSaving(false);
    }
  };

  const updateBalance = async () => {
    try {
      // Obtener el balance actual
      const { data: balanceData, error: balanceError } = await supabase
        .from('condominium_balances')
        .select('*')
        .eq('id', balanceId)
        .single();

      if (balanceError) throw balanceError;

      // Obtener todas las transacciones para este balance
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('balance_id', balanceId);

      if (transactionsError) throw transactionsError;

      // Calcular ingresos y egresos
      let totalIncome = 0;
      let totalExpenses = 0;

      (transactionsData || []).forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += transaction.amount;
        } else {
          totalExpenses += transaction.amount;
        }
      });

      // Calcular el saldo final
      const finalBalance = balanceData.initial_balance + totalIncome - totalExpenses;

      // Actualizar el balance
      const { error: updateError } = await supabase
        .from('condominium_balances')
        .update({
          income: totalIncome,
          expenses: totalExpenses,
          final_balance: finalBalance
        })
        .eq('id', balanceId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error al actualizar el balance:', err);
      throw err;
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setFormData({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category
    });
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro que desea eliminar esta transacción?')) {
      try {
        const { error } = await supabase
          .from('balance_transactions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        // Actualizar el balance después de eliminar la transacción
        await updateBalance();
        
        // Recargar las transacciones
        await fetchTransactions();
        
        // Notificar al componente padre que hubo un cambio en las transacciones
        onTransactionChange();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar la transacción');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'income',
      category: 'otros'
    });
  };

  const getCategoryLabel = (categoryValue: string) => {
    return TRANSACTION_CATEGORIES.find(c => c.value === categoryValue)?.label || categoryValue;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Transacciones</CardTitle>
          <Button onClick={() => {
            resetForm();
            setEditingTransaction(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Transacción
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {showForm ? (
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
              </h2>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingTransaction(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Fecha"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
                
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="income">Ingreso</option>
                    <option value="expense">Egreso</option>
                  </select>
                </div>
              </div>

              <Input
                label="Descripción"
                name="description"
                type="text"
                value={formData.description}
                onChange={handleChange}
                required
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Monto"
                  name="amount"
                  type="text"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    {TRANSACTION_CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTransaction(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : editingTransaction ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-700"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay transacciones registradas. Haga clic en "Nueva Transacción" para crear una.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCategoryLabel(transaction.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {transaction.type === 'income' ? (
                          <span className="flex items-center">
                            <ArrowUp className="h-3 w-3 mr-1" />
                            Ingreso
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <ArrowDown className="h-3 w-3 mr-1" />
                            Egreso
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
