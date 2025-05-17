import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, DollarSign, Building, Users, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';
import Select from '../../components/ui/Select';

interface Condominium {
  id: string;
  name: string;
}

// Eliminada la interfaz Employee que no se utilizaba

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
  payment_date?: string;
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
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
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
    fetchCondominiums();
    // Cargar todas las compensaciones al inicio, sin filtrar por consorcio
    fetchAllCompensations();
  }, []);

  useEffect(() => {
    // Si se selecciona un consorcio específico, filtrar las compensaciones
    if (selectedCondominium) {
      fetchCompensationsByCondominium(selectedCondominium);
    } else {
      // Si se deselecciona (se elige "Todos"), mostrar todas las compensaciones
      fetchAllCompensations();
    }
  }, [selectedCondominium]);

  useEffect(() => {
    applyFilters();
  }, [compensations, searchTerm, selectedStatus, selectedMonth, selectedYear]);

  const fetchCondominiums = async () => {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      // Agregar opción "Todos los consorcios" al inicio
      const allCondominiums = [
        { id: '', name: 'Todos los consorcios' },
        ...(data || [])
      ];
      
      setCondominiums(allCondominiums);
      // No seleccionamos ningún consorcio por defecto para mostrar todos
      setSelectedCondominium('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los consorcios');
    }
  };

  // Obtener todas las compensaciones sin filtrar por consorcio
  const fetchAllCompensations = async () => {
    try {
      setLoading(true);
      
      // Obtenemos todas las compensaciones
      const { data: compensationsData, error: compensationsError } = await supabase
        .from('employee_compensations')
        .select(`
          *,
          employee:employees(id, name, position)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (compensationsError) throw compensationsError;
      
      // Obtenemos todos los pagos
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('employee_payments')
        .select('*');
      
      if (paymentsError) throw paymentsError;
      
      // Obtenemos información de consorcios para cada empleado
      const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
        .from('employee_condominiums')
        .select(`
          employee_id,
          condominium:condominiums(id, name)
        `);
        
      if (employeeCondominiumsError) throw employeeCondominiumsError;
      
      // Combinamos la información de compensaciones, pagos y consorcios
      const enhancedCompensations = (compensationsData || []).map(comp => {
        // Buscamos si existe un pago para esta compensación
        const payment = (paymentsData || []).find(p => 
          p.employee_id === comp.employee_id && 
          p.month === comp.month && 
          p.year === comp.year
        );
        
        // Buscamos los consorcios a los que pertenece el empleado
        const employeeCondominiumsList = (employeeCondominiums || [])
          .filter(ec => ec.employee_id === comp.employee_id)
          .map(ec => ec.condominium);
        
        return {
          ...comp,
          payment_status: payment ? 'paid' : 'pending',
          payment_date: payment?.payment_date,
          condominiums: employeeCondominiumsList
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
  const fetchCompensationsByCondominium = async (condominiumId: string) => {
    try {
      setLoading(true);
      
      // Primero obtenemos los empleados del consorcio seleccionado
      const { data: employees, error: employeesError } = await supabase
        .from('employee_condominiums')
        .select(`
          employee_id,
          employee:employees(id, name, position)
        `)
        .eq('condominium_id', condominiumId);
      
      if (employeesError) throw employeesError;
      
      if (!employees || employees.length === 0) {
        setCompensations([]);
        setFilteredCompensations([]);
        setLoading(false);
        return;
      }
      
      // Obtenemos los IDs de los empleados
      const employeeIds = employees.map(e => e.employee_id);
      
      // Obtenemos las compensaciones de estos empleados
      const { data: compensationsData, error: compensationsError } = await supabase
        .from('employee_compensations')
        .select(`
          *,
          employee:employees(id, name, position)
        `)
        .in('employee_id', employeeIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (compensationsError) throw compensationsError;
      
      // Obtenemos los pagos para determinar el estado de cada compensación
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('employee_payments')
        .select('*')
        .in('employee_id', employeeIds);
      
      if (paymentsError) throw paymentsError;
      
      // Obtenemos información de consorcios para cada empleado
      const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
        .from('employee_condominiums')
        .select(`
          employee_id,
          condominium:condominiums(id, name)
        `)
        .in('employee_id', employeeIds);
        
      if (employeeCondominiumsError) throw employeeCondominiumsError;
      
      // Combinamos la información de compensaciones, pagos y consorcios
      const enhancedCompensations = (compensationsData || []).map(comp => {
        // Buscamos si existe un pago para esta compensación
        const payment = (paymentsData || []).find(p => 
          p.employee_id === comp.employee_id && 
          p.month === comp.month && 
          p.year === comp.year
        );
        
        // Buscamos los consorcios a los que pertenece el empleado
        const employeeCondominiumsList = (employeeCondominiums || [])
          .filter(ec => ec.employee_id === comp.employee_id)
          .map(ec => ec.condominium);
        
        return {
          ...comp,
          payment_status: payment ? 'paid' : 'pending',
          payment_date: payment?.payment_date,
          condominiums: employeeCondominiumsList
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

  const applyFilters = () => {
    let filtered = [...compensations];
    
    // Filtrar por término de búsqueda (nombre de empleado)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(comp => 
        comp.employee.name.toLowerCase().includes(term)
      );
    }
    
    // Filtrar por estado
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
    
    // Ordenar para mostrar primero las compensaciones pendientes
    filtered.sort((a, b) => {
      // Primero ordenar por estado (pendientes primero)
      if (a.payment_status === 'pending' && b.payment_status !== 'pending') return -1;
      if (a.payment_status !== 'pending' && b.payment_status === 'pending') return 1;
      
      // Si ambos tienen el mismo estado, ordenar por fecha (más recientes primero)
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    setFilteredCompensations(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleStatusChange = async (compensationId: string, employeeId: string, month: number, year: number, newStatus: 'pending' | 'paid') => {
    try {
      if (newStatus === 'paid') {
        // Obtener datos del empleado y consorcio
        const { data: employeeData, error: employeeError } = await supabase
          .from('employee_condominiums')
          .select('condominium_id')
          .eq('employee_id', employeeId)
          .single();
        
        if (employeeError) throw employeeError;
        
        // Obtener la compensación
        const { data: compensationData, error: compensationError } = await supabase
          .from('employee_compensations')
          .select('*')
          .eq('id', compensationId)
          .single();
        
        if (compensationError) throw compensationError;
        
        // Crear un pago para esta compensación
        const { error: paymentError } = await supabase
          .from('employee_payments')
          .insert({
            employee_id: employeeId,
            condominium_id: employeeData.condominium_id,
            month: month,
            year: year,
            base_salary: compensationData.net_salary,
            social_security: compensationData.social_security,
            union_fee: compensationData.union_contribution,
            deductions: compensationData.other_deductions,
            total_amount: compensationData.total_compensation,
            payment_date: new Date().toISOString().split('T')[0],
            status: 'paid'
          });
        
        if (paymentError) throw paymentError;
      } else {
        // Si se marca como pendiente, eliminar el pago existente
        const { error: deleteError } = await supabase
          .from('employee_payments')
          .delete()
          .eq('employee_id', employeeId)
          .eq('month', month)
          .eq('year', year);
        
        if (deleteError) throw deleteError;
      }
      
      // Actualizar el estado local
      setCompensations(prevCompensations => 
        prevCompensations.map(comp => 
          comp.id === compensationId 
            ? { ...comp, payment_status: newStatus, payment_date: newStatus === 'paid' ? new Date().toISOString() : undefined } 
            : comp
        )
      );
    } catch (err) {
      alert('Error al actualizar el estado del pago');
      console.error(err);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedMonth(null);
    setSelectedYear(null);
  };

  if (loading && !filteredCompensations.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employees')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Control de Remuneraciones</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consorcio
              </label>
              <Select
                value={selectedCondominium}
                onChange={(e) => setSelectedCondominium(e.target.value)}
                className="w-full"
              >
                {condominiums.map((condominium) => (
                  <option key={condominium.id} value={condominium.id}>
                    {condominium.name}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nombre de empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 border rounded-md"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full"
              >
                {PAYMENT_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
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
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="w-full"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Dashboard con estadísticas visuales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total de compensaciones */}
        <Card className={`bg-gray-50 border-t-4 border-blue-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total de remuneraciones</p>
                <h3 className="text-2xl font-bold">{filteredCompensations.length}</h3>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
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
            {filteredCompensations.length} remuneraciones encontradas
          </h2>
        </div>

        {filteredCompensations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No se encontraron remuneraciones con los filtros seleccionados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCompensations.map((compensation) => (
              <Card 
                key={compensation.id} 
                className={`overflow-hidden ${compensation.payment_status === 'paid' ? 'border-l-4 border-l-green-500' : compensation.payment_status === 'pending' ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <CardContent>
                  <div className={`p-4 -m-4 mb-4 border-b ${compensation.payment_status === 'paid' ? 'bg-green-50' : compensation.payment_status === 'pending' ? 'bg-red-50' : 'bg-gray-50'} flex justify-between items-center`}>
                    <div>
                      <h3 className="text-lg font-semibold">{compensation.employee.name}</h3>
                      <p className="text-sm text-gray-600">{compensation.employee.position}</p>
                      <p className="text-sm text-gray-600">
                        {MONTHS[compensation.month - 1]} {compensation.year}
                      </p>
                      {/* Mostrar los consorcios a los que pertenece el empleado */}
                      {compensation.condominiums && compensation.condominiums.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {compensation.condominiums.map(condo => (
                            <span key={condo.id} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                              <Building className="h-3 w-3 mr-1" />
                              {condo.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={getStatusBadgeVariant(compensation.payment_status || 'pending')}>
                          {compensation.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                        {compensation.payment_date && (
                          <span className="text-xs text-gray-500">
                            Pagado el {new Date(compensation.payment_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(compensation.total_compensation)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Salario neto:</span>
                        <span className="ml-2 font-medium">{formatCurrency(compensation.net_salary)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Seguridad social:</span>
                        <span className="ml-2 font-medium">{formatCurrency(compensation.social_security)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Aporte sindical:</span>
                        <span className="ml-2 font-medium">{formatCurrency(compensation.union_contribution)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Otras deducciones:</span>
                        <span className="ml-2 font-medium">{formatCurrency(compensation.other_deductions)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/employees/${compensation.employee_id}/compensations`)}
                      >
                        Ver historial
                      </Button>
                      
                      {compensation.payment_status === 'pending' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusChange(compensation.id, compensation.employee_id, compensation.month, compensation.year, 'paid')}
                        >
                          Marcar como pagado
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(compensation.id, compensation.employee_id, compensation.month, compensation.year, 'pending')}
                        >
                          Marcar como pendiente
                        </Button>
                      )}
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
