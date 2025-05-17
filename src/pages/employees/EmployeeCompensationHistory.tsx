import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Trash2, Edit } from 'lucide-react';
import EmployeeCompensation from './EmployeeCompensation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface CompensationRecord {
  id: string;
  employee_id: string;
  net_salary: number;
  social_security: number;
  union_contribution: number;
  other_deductions: number;
  total_compensation: number;
  month: number;
  year: number;
  created_at: string;
  updated_at?: string;
}

const EmployeeCompensationHistory: React.FC = () => {
  const { id: employeeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!employeeId) {
    navigate('/employees');
    return null;
  }

  const { supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compensations, setCompensations] = useState<CompensationRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCompensation, setEditingCompensation] = useState<CompensationRecord | null>(null);

  useEffect(() => {
    fetchCompensations();
  }, [employeeId]);

  const fetchCompensations = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_compensations')
        .select('*')
        .eq('employee_id', employeeId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setCompensations(data || []);
    } catch (err) {
      console.error('Error al obtener remuneraciones:', err);
      setError('Error al cargar el historial de remuneraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este registro?')) return;

    try {
      const { error } = await supabase
        .from('employee_compensations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCompensations();
    } catch (err) {
      console.error('Error al eliminar remuneración:', err);
      setError('Error al eliminar el registro');
    }
  };

  const handleEdit = (compensation: CompensationRecord) => {
    setEditingCompensation(compensation);
  };

  const handleSuccess = () => {
    fetchCompensations();
    setEditingCompensation(null);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return format(date, 'MMMM', { locale: es });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Historial de Remuneraciones</h2>
        <Button onClick={() => setShowAddForm(true)}>
          Agregar Remuneración
        </Button>
      </div>

      {(showAddForm || editingCompensation) && (
        <div className="mb-6">
          <EmployeeCompensation
            employeeId={employeeId}
            compensationId={editingCompensation?.id}
            initialData={editingCompensation || undefined}
            onClose={() => {
              setShowAddForm(false);
              setEditingCompensation(null);
            }}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sueldo Neto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargas Sociales
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aportes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Otros
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actualizado
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {compensations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No hay registros de remuneraciones
                  </td>
                </tr>
              ) : (
                compensations.map((compensation) => (
                  <tr key={compensation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getMonthName(compensation.month)} {compensation.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${compensation.net_salary.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${compensation.social_security.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${compensation.union_contribution.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${compensation.other_deductions.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${compensation.total_compensation.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(compensation.updated_at || compensation.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(compensation)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(compensation.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default EmployeeCompensationHistory;