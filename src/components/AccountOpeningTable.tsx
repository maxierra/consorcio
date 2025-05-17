import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Trash2, PlusCircle, Edit } from 'lucide-react';
import Button from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import AccountOpeningForm from './AccountOpeningForm';

interface AccountOpeningTableProps {
  condominiumId: string;
}

interface CondominiumBalance {
  id: string;
  condominium_id: string;
  period_month: number;
  period_year: number;
  initial_balance: number;
  income: number;
  expenses: number;
  final_balance: number;
  status: string;
  notes: string;
  created_at: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const STATUS_LABELS: Record<string, string> = {
  'pendiente': 'Pendiente',
  'aprobado': 'Aprobado',
  'cerrado': 'Cerrado'
};

const STATUS_COLORS: Record<string, string> = {
  'pendiente': 'bg-yellow-100 text-yellow-800',
  'aprobado': 'bg-green-100 text-green-800',
  'cerrado': 'bg-blue-100 text-blue-800'
};

export default function AccountOpeningTable({ condominiumId }: AccountOpeningTableProps) {
  const [balances, setBalances] = useState<CondominiumBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBalance, setEditingBalance] = useState<CondominiumBalance | null>(null);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('condominium_balances')
        .select('*')
        .eq('condominium_id', condominiumId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (error) throw error;
      setBalances(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [condominiumId]);

  const handleEdit = (balance: CondominiumBalance) => {
    setEditingBalance(balance);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro que desea eliminar este registro?')) {
      try {
        const { error } = await supabase
          .from('condominium_balances')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await fetchBalances();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar el registro');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Aperturas por Cuentas</CardTitle>
          <Button onClick={() => {
            setEditingBalance(null);
            setShowForm(true);
          }}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva Apertura
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
          <AccountOpeningForm
            condominiumId={condominiumId}
            balanceToEdit={editingBalance}
            onClose={() => {
              setShowForm(false);
              setEditingBalance(null);
            }}
            onSuccess={() => {
              fetchBalances();
              setShowForm(false);
              setEditingBalance(null);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-700"></div>
              </div>
            ) : balances.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay aperturas de cuentas registradas. Haga clic en "Nueva Apertura" para crear una.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Inicial</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Egresos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Final</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {balances.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {MONTHS[item.period_month - 1]} {item.period_year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.initial_balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.income)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.expenses)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.final_balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[item.status]}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
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
        )}
      </CardContent>
    </Card>
  );
}
