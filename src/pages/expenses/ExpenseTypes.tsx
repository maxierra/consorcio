import { useState, useEffect } from 'react';
import { Plus, Building2, Mail, Phone, MapPin, Pencil, Trash2, Building } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';

interface Employee {
  id: string;
  name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  position: string;
  active: boolean;
  condominiums?: {
    id: string;
    name: string;
  }[];
}

// Define color schemes for cards
const cardColors = [
  { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', icon: 'text-blue-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:bg-emerald-100', icon: 'text-emerald-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', hover: 'hover:bg-violet-100', icon: 'text-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:bg-amber-100', icon: 'text-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', hover: 'hover:bg-rose-100', icon: 'text-rose-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:bg-cyan-100', icon: 'text-cyan-500' },
];

export default function ExpenseTypes() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          condominiums:employee_condominiums(
            condominium:condominiums(
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const transformedData = data?.map(employee => ({
        ...employee,
        condominiums: employee.condominiums
          ?.map(ec => ec.condominium)
          .filter(Boolean)
      })) || [];

      setEmployees(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!selectedEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', selectedEmployee.id);

      if (error) throw error;
      
      await fetchEmployees();
      setShowDeleteModal(false);
      setSelectedEmployee(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el empleado');
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
        <Button onClick={() => navigate('/employees/new')}>
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay empleados</h3>
          <p className="mt-1 text-sm text-gray-500">Comience agregando un nuevo empleado.</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/employees/new')}>
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Empleado
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee, index) => {
            const colorScheme = cardColors[index % cardColors.length];
            return (
              <Card 
                key={employee.id} 
                className={`transition-all duration-200 cursor-pointer border-2 ${colorScheme.bg} ${colorScheme.border} ${colorScheme.hover}`}
                onClick={() => navigate(`/employees/${employee.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-semibold">
                    {employee.name}
                  </CardTitle>
                  <Badge variant={employee.active ? 'success' : 'warning'}>
                    {employee.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                      <span>Cargo: {employee.position}</span>
                    </div>
                    {employee.tax_id && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>CUIL: {employee.tax_id}</span>
                      </div>
                    )}
                    {employee.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{employee.email}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                    {employee.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{employee.address}</span>
                      </div>
                    )}
                    
                    {employee.condominiums && employee.condominiums.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Building className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                          <span>Consorcios asignados:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {employee.condominiums.map((condo) => (
                            <Badge key={condo.id} variant="info">
                              {condo.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employees/${employee.id}/edit`);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(employee);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedEmployee(null);
        }}
        onConfirm={handleDelete}
        title="¿Eliminar empleado?"
        message="Esta acción eliminará permanentemente el empleado y todos sus registros asociados. Esta acción no se puede deshacer."
      />
    </div>
  );
}