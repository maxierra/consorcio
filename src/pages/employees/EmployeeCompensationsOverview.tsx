import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, DollarSign, Building, 
  CheckCircle, Clock, Receipt, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';

interface Condominium {
  id: string;
  name: string;
}

interface EmployeeCompensation {
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
  payment_status?: 'pending' | 'paid';
  payment_date?: string | null;
  employee: {
    id: string;
    name: string;
    position: string;
  };
  condominiums?: {
    id: string;
    name: string;
  }[];
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const PAYMENT_STATUS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' }
];

export default function EmployeeCompensationsOverview() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtenemos el usuario actual
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [userCondominiums, setUserCondominiums] = useState<string[]>([]); // IDs de consorcios del usuario
  const [selectedCondominium, setSelectedCondominium] = useState<string>('');
  const [compensations, setCompensations] = useState<EmployeeCompensation[]>([]);
  const [filteredCompensations, setFilteredCompensations] = useState<EmployeeCompensation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Obtener años disponibles para los filtros
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    // Al cargar el componente, obtenemos los consorcios del usuario
    fetchUserCondominiums();
  }, []);

  useEffect(() => {
    // Cuando tengamos los consorcios del usuario, cargamos las compensaciones
    if (userCondominiums.length > 0) {
      fetchAllCompensations();
    }
  }, [userCondominiums]);

  useEffect(() => {
    // Si se selecciona un consorcio específico, filtrar las compensaciones
    if (selectedCondominium) {
      fetchCompensationsByCondominium(selectedCondominium);
    } else {
      // Si no hay consorcio seleccionado, mostrar todas las compensaciones (ya filtradas por usuario)
      setFilteredCompensations(compensations);
    }
  }, [selectedCondominium, compensations]);

  useEffect(() => {
    applyFilters();
  }, [compensations, searchTerm, selectedStatus, selectedMonth, selectedYear]);

  // Obtener los consorcios asociados al usuario actual
  const fetchUserCondominiums = async () => {
    try {
      setLoading(true);
      
      // Intentamos obtener los consorcios asociados al usuario desde la tabla user_condominiums
      const { data: userCondominiumsData, error: userCondominiumsError } = await supabase
        .from('user_condominiums')
        .select('condominium_id')
        .eq('user_id', user?.id);
      
      if (userCondominiumsError) {
        console.warn('No se pudo obtener los consorcios del usuario, mostrando todos:', userCondominiumsError);
        
        // Si hay un error (posiblemente porque la tabla no existe), obtenemos todos los consorcios
        const { data, error } = await supabase
          .from('condominiums')
          .select('id, name')
          .order('name');

        if (error) throw error;
        
        // Guardar los IDs de todos los consorcios
        const condominiumIds = (data || []).map(condo => condo.id);
        setUserCondominiums(condominiumIds);
        
        // Agregar opción "Todos los consorcios" al inicio
        const allCondominiums = [
          { id: '', name: 'Todos los consorcios' },
          ...(data || [])
        ];
        
        setCondominiums(allCondominiums);
      } else {
        // Si obtenemos los consorcios del usuario correctamente
        const userCondominiumIds = (userCondominiumsData || []).map(uc => uc.condominium_id);
        setUserCondominiums(userCondominiumIds);
        
        if (userCondominiumIds.length === 0) {
          // Si el usuario no tiene consorcios asociados, no mostramos ninguno
          setCondominiums([{ id: '', name: 'No hay consorcios disponibles' }]);
          setLoading(false);
          return;
        }
        
        // Obtenemos los detalles de los consorcios del usuario
        const { data, error } = await supabase
          .from('condominiums')
          .select('id, name')
          .in('id', userCondominiumIds)
          .order('name');

        if (error) throw error;
        
        // Agregar opción "Todos los consorcios" al inicio
        const allCondominiums = [
          { id: '', name: 'Todos los consorcios' },
          ...(data || [])
        ];
        
        setCondominiums(allCondominiums);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los consorcios');
    } finally {
      setLoading(false);
    }
  };

  // Obtener las compensaciones de empleados filtradas por los consorcios del usuario
  const fetchAllCompensations = async () => {
    try {
      setLoading(true);
      
      // Si no hay consorcios asociados al usuario, no mostramos compensaciones
      if (userCondominiums.length === 0) {
        setCompensations([]);
        setFilteredCompensations([]);
        setLoading(false);
        return;
      }
      
      // Primero obtenemos los IDs de empleados asociados a los consorcios del usuario
      const { data: employeeCondominiumsData, error: employeeCondominiumsError } = await supabase
        .from('employee_condominiums')
        .select('employee_id')
        .in('condominium_id', userCondominiums);
      
      if (employeeCondominiumsError) {
        console.warn('Error al obtener empleados por consorcio:', employeeCondominiumsError);
        setError('Error al obtener empleados por consorcio');
        setLoading(false);
        return;
      }
      
      // Obtenemos los IDs únicos de empleados
      const employeeIds = [...new Set((employeeCondominiumsData || []).map(ec => ec.employee_id))];
      
      // Si no hay empleados asociados a los consorcios del usuario, no mostramos compensaciones
      if (employeeIds.length === 0) {
        setCompensations([]);
        setFilteredCompensations([]);
        setLoading(false);
        return;
      }
      
      // Obtenemos las compensaciones de los empleados asociados a los consorcios del usuario
      const { data: compensationsData, error: compensationsError } = await supabase
        .from('employee_compensations')
        .select(`
          *,
          employee:employees(id, name, position)
        `)
        .in('employee_id', employeeIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (compensationsError) {
        setError(compensationsError.message || 'Error al cargar las compensaciones');
        setLoading(false);
        return;
      }
      
      // Verificamos si hay compensaciones sin empleado asociado
      const compensationsWithValidEmployee = (compensationsData || []).map(comp => {
        if (!comp.employee) {
          // Si no hay empleado asociado, creamos un objeto con valores por defecto
          return {
            ...comp,
            employee: {
              id: comp.employee_id || 'unknown',
              name: 'Empleado no encontrado',
              position: 'Posición desconocida'
            }
          };
        }
        return comp;
      });

      // Obtenemos la relación entre empleados y consorcios para mostrar a qué consorcios pertenece cada empleado
      const { data: employeeCondominiums, error: ecError } = await supabase
        .from('employee_condominiums')
        .select(`
          employee_id,
          condominium:condominiums(id, name)
        `)
        .in('employee_id', employeeIds);

      if (ecError) {
        console.warn('Error al obtener la relación empleado-consorcio:', ecError);
      }

      // Agregamos la información de consorcios a cada compensación
      const enhancedCompensations = compensationsWithValidEmployee.map(comp => {
        const employeeConsorcios = (employeeCondominiums || [])
          .filter(ec => ec.employee_id === comp.employee_id)
          .map(ec => ec.condominium);

        return {
          ...comp,
          condominiums: employeeConsorcios
        };
      });

      setCompensations(enhancedCompensations);
      setFilteredCompensations(enhancedCompensations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las compensaciones');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar compensaciones por consorcio específico
  const fetchCompensationsByCondominium = (condominiumId: string) => {
    if (!condominiumId) {
      setFilteredCompensations(compensations);
      return;
    }

    const filtered = compensations.filter(comp => {
      return comp.condominiums?.some(c => c.id === condominiumId);
    });

    setFilteredCompensations(filtered);
  };

  // Aplicar filtros de búsqueda, estado, mes y año
  const applyFilters = () => {
    let filtered = [...compensations];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(comp => 
        comp.employee?.name.toLowerCase().includes(term) ||
        comp.employee?.position.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado de pago
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(comp => comp.payment_status === selectedStatus);
    }

    // Filtrar por mes
    if (selectedMonth !== null) {
      filtered = filtered.filter(comp => comp.month === selectedMonth);
    }

    // Filtrar por año
    if (selectedYear !== null) {
      filtered = filtered.filter(comp => comp.year === selectedYear);
    }

    // Si hay un consorcio seleccionado, aplicar ese filtro también
    if (selectedCondominium) {
      filtered = filtered.filter(comp => {
        return comp.condominiums?.some(c => c.id === selectedCondominium);
      });
    }

    setFilteredCompensations(filtered);
  };

  // Obtener la variante de badge según el estado de pago
  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Manejar cambio de estado de pago
  const handleStatusChange = async (compensationId: string, newStatus: 'pending' | 'paid') => {
    try {
      // Fecha actual para registrar el momento del pago
      const currentDate = new Date().toISOString();
      
      const { error } = await supabase
        .from('employee_compensations')
        .update({ 
          payment_status: newStatus,
          payment_date: newStatus === 'paid' ? currentDate : null
        })
        .eq('id', compensationId);

      if (error) throw error;

      // Actualizar el estado local
      setCompensations(prevCompensations => 
        prevCompensations.map(comp => 
          comp.id === compensationId ? 
          { 
            ...comp, 
            payment_status: newStatus,
            payment_date: newStatus === 'paid' ? currentDate : null
          } : 
          comp
        )
      );

      // Actualizar también las compensaciones filtradas
      setFilteredCompensations(prevCompensations => 
        prevCompensations.map(comp => 
          comp.id === compensationId ? 
          { 
            ...comp, 
            payment_status: newStatus,
            payment_date: newStatus === 'paid' ? currentDate : null
          } : 
          comp
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado de pago');
    }
  };

  // Resetear todos los filtros
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedMonth(null);
    setSelectedYear(null);
    setSelectedCondominium('');
    setFilteredCompensations(compensations);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Control de Remuneraciones</h1>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Consorcio</label>
              <Select value={selectedCondominium} onValueChange={setSelectedCondominium}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar consorcio" />
                </SelectTrigger>
                <SelectContent>
                  {condominiums.map((condo) => (
                    <SelectItem key={condo.id} value={condo.id}>
                      {condo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o posición"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-2 w-full border rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Mes</label>
              <Select
                value={selectedMonth !== null ? selectedMonth.toString() : ''}
                onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full"
              >
                <option value="">Todos los meses</option>
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Año</label>
              <Select
                value={selectedYear !== null ? selectedYear.toString() : ''}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full"
              >
                <option value="">Todos los años</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="w-full md:w-auto"
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard con estadísticas visuales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total de compensaciones */}
        <Card className={`bg-gray-50 border-t-4 border-blue-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total de compensaciones</p>
                <h3 className="text-2xl font-bold">{filteredCompensations.length}</h3>
              </div>
              <Receipt className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Compensaciones pagadas */}
        <Card className={`bg-gray-50 border-t-4 border-green-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Pagadas</p>
                <h3 className="text-2xl font-bold">
                  {filteredCompensations.filter(comp => comp.payment_status === 'paid').length}
                </h3>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Compensaciones pendientes */}
        <Card className={`bg-gray-50 border-t-4 border-red-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Pendientes</p>
                <h3 className="text-2xl font-bold">
                  {filteredCompensations.filter(comp => comp.payment_status === 'pending').length}
                </h3>
              </div>
              <Clock className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Monto total */}
        <Card className={`bg-gray-50 border-t-4 border-purple-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Monto total</p>
                <h3 className="text-2xl font-bold">
                  {formatCurrency(filteredCompensations.reduce((sum, comp) => sum + comp.total_compensation, 0))}
                </h3>
              </div>
              <DollarSign className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso visual */}
      {filteredCompensations.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Progreso de pagos</h3>
                <span className="text-sm text-gray-500">
                  {Math.round((filteredCompensations.filter(comp => comp.payment_status === 'paid').length / filteredCompensations.length) * 100)}% completado
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full" 
                  style={{ width: `${(filteredCompensations.filter(comp => comp.payment_status === 'paid').length / filteredCompensations.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">
            {filteredCompensations.length} compensaciones encontradas
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
          </div>
        ) : filteredCompensations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No se encontraron compensaciones con los filtros seleccionados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCompensations.map((compensation) => (
              <Card 
                key={compensation.id} 
                className={`overflow-hidden ${compensation.payment_status === 'paid' ? 'border-l-4 border-l-green-500' : compensation.payment_status === 'pending' ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className={`p-4 border-b ${compensation.payment_status === 'paid' ? 'bg-green-50' : compensation.payment_status === 'pending' ? 'bg-red-50' : 'bg-gray-50'} flex justify-between items-center`}>
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-medium">{compensation.employee?.name}</h3>
                      <p className="text-sm text-gray-500">{compensation.employee?.position}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(compensation.payment_status)} className={compensation.payment_status === 'paid' ? 'bg-green-500' : compensation.payment_status === 'pending' ? 'bg-red-500' : ''}>
                    {compensation.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Período: {MONTHS[compensation.month - 1]} {compensation.year}</span>
                      </div>
                      {compensation.payment_status === 'paid' && compensation.payment_date && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Pagado el {new Date(compensation.payment_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {compensation.condominiums && compensation.condominiums.length > 0 && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Building className="h-4 w-4 mr-2" />
                          <span>Consorcios: {compensation.condominiums.map(c => c.name).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span>Salario neto: {formatCurrency(compensation.net_salary)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span>Seguridad social: {formatCurrency(compensation.social_security)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span>Aporte sindical: {formatCurrency(compensation.union_contribution)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span>Otras deducciones: {formatCurrency(compensation.other_deductions)}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center font-medium">
                        <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                        <span>Compensación total: {formatCurrency(compensation.total_compensation)}</span>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        {compensation.payment_status === 'pending' ? (
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => handleStatusChange(compensation.id, 'paid')}
                            className="flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como pagado
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleStatusChange(compensation.id, 'pending')}
                            className="flex items-center"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Marcar como pendiente
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
