import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, DollarSign, Building, Receipt, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';

interface Condominium {
  id: string;
  name: string;
}

// Interfaces para los datos

interface ProviderInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'cancelled';
  receipt_url: string | null;
  month: number;
  year: number;
  category: string;
  provider_id: string;
  condominium_id: string;
  provider: {
    name: string;
  };
  condominium: {
    name: string;
  };
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const INVOICE_CATEGORIES = [
  { value: 'expensas_ordinarias_a', label: 'Expensas Ordinarias A' },
  { value: 'expensas_ordinarias_b', label: 'Expensas Ordinarias B' },
  { value: 'expensas_aysa', label: 'Expensas Aysa' },
  { value: 'otros', label: 'Otros' }
];

const INVOICE_STATUS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'cancelled', label: 'Canceladas' }
];

export default function ProviderInvoicesOverview() {
  const navigate = useNavigate();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondominium, setSelectedCondominium] = useState<string>('');
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<ProviderInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Obtener años disponibles para los filtros
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchCondominiums();
    // Cargar todas las facturas al inicio, sin filtrar por consorcio
    fetchAllInvoices();
  }, []);

  useEffect(() => {
    // Si se selecciona un consorcio específico, filtrar las facturas
    if (selectedCondominium) {
      fetchInvoicesByCondominium(selectedCondominium);
    } else {
      // Si se deselecciona (se elige "Todos"), mostrar todas las facturas
      fetchAllInvoices();
    }
  }, [selectedCondominium]);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchTerm, selectedStatus, selectedMonth, selectedYear, selectedCategory]);

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

  // Obtener todas las facturas sin filtrar por consorcio
  const fetchAllInvoices = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('provider_invoices')
        .select(`
          *,
          provider:providers(name),
          condominium:condominiums(name)
        `)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
      setFilteredInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar facturas por consorcio específico
  const fetchInvoicesByCondominium = async (condominiumId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('provider_invoices')
        .select(`
          *,
          provider:providers(name),
          condominium:condominiums(name)
        `)
        .eq('condominium_id', condominiumId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
      setFilteredInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...invoices];
    
    // Filtrar por término de búsqueda (proveedor, número de factura o descripción)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.provider.name.toLowerCase().includes(term) ||
        invoice.invoice_number.toLowerCase().includes(term) ||
        invoice.description.toLowerCase().includes(term)
      );
    }
    
    // Filtrar por estado
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === selectedStatus);
    }
    
    // Filtrar por mes
    if (selectedMonth !== null) {
      filtered = filtered.filter(invoice => invoice.month === selectedMonth);
    }
    
    // Filtrar por año
    if (selectedYear !== null) {
      filtered = filtered.filter(invoice => invoice.year === selectedYear);
    }
    
    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(invoice => invoice.category === selectedCategory);
    }
    
    // Ordenar para mostrar primero las facturas pendientes
    filtered.sort((a, b) => {
      // Primero ordenar por estado (pendientes primero)
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // Si ambos tienen el mismo estado, ordenar por fecha de vencimiento (más recientes primero)
      return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
    });
    
    setFilteredInvoices(filtered);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };
  
  const getCategoryLabel = (categoryValue: string) => {
    return INVOICE_CATEGORIES.find(c => c.value === categoryValue)?.label || categoryValue;
  };

  const handleStatusChange = async (invoiceId: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('provider_invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
        
      if (error) throw error;
      
      // Actualizar la lista de facturas
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === invoiceId 
            ? { ...invoice, status: newStatus } 
            : invoice
        )
      );
    } catch (err) {
      alert('Error al actualizar el estado de la factura');
      console.error(err);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedMonth(null);
    setSelectedYear(null);
    setSelectedCategory('');
  };

  if (loading && !filteredInvoices.length) {
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
            onClick={() => navigate('/providers')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Pago de Facturas a Proveedores</h1>
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
                  placeholder="Proveedor, N° factura..."
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
                {INVOICE_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full"
              >
                <option value="">Todas las categorías</option>
                {INVOICE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
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
        {/* Total de facturas */}
        <Card className={`bg-gray-50 border-t-4 border-blue-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total de facturas</p>
                <h3 className="text-2xl font-bold">{filteredInvoices.length}</h3>
              </div>
              <Receipt className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Facturas pagadas */}
        <Card className={`bg-gray-50 border-t-4 border-green-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Pagadas</p>
                <h3 className="text-2xl font-bold">
                  {filteredInvoices.filter(inv => inv.status === 'paid').length}
                </h3>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Facturas pendientes */}
        <Card className={`bg-gray-50 border-t-4 border-red-500`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Pendientes</p>
                <h3 className="text-2xl font-bold">
                  {filteredInvoices.filter(inv => inv.status === 'pending').length}
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
                  {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                </h3>
              </div>
              <DollarSign className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso visual */}
      {filteredInvoices.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Progreso de pagos</h3>
                <span className="text-sm text-gray-500">
                  {Math.round((filteredInvoices.filter(inv => inv.status === 'paid').length / filteredInvoices.length) * 100)}% completado
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full" 
                  style={{ width: `${(filteredInvoices.filter(inv => inv.status === 'paid').length / filteredInvoices.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">
            {filteredInvoices.length} facturas encontradas
          </h2>
        </div>

        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No se encontraron facturas con los filtros seleccionados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredInvoices.map((invoice) => (
              <Card 
                key={invoice.id} 
                className={`overflow-hidden ${invoice.status === 'paid' ? 'border-l-4 border-l-green-500' : invoice.status === 'pending' ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className={`p-4 border-b ${invoice.status === 'paid' ? 'bg-green-50' : invoice.status === 'pending' ? 'bg-red-50' : 'bg-gray-50'} flex justify-between items-center`}>
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-medium">{invoice.provider.name}</h3>
                      <p className="text-sm text-gray-500">Factura #{invoice.invoice_number}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(invoice.status)} className={invoice.status === 'paid' ? 'bg-green-500' : invoice.status === 'pending' ? 'bg-red-500' : ''}>
                    {invoice.status === 'paid' && 'Pagada'}
                    {invoice.status === 'pending' && 'Pendiente'}
                    {invoice.status === 'cancelled' && 'Cancelada'}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Fecha de emisión: {new Date(invoice.invoice_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Fecha de vencimiento: {new Date(invoice.due_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Building className="h-4 w-4 mr-2" />
                        <span>Consorcio: {invoice.condominium.name}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span>Monto: {formatCurrency(invoice.amount)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Receipt className="h-4 w-4 mr-2" />
                        <span>Categoría: {getCategoryLabel(invoice.category)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Período: {MONTHS[invoice.month - 1]} {invoice.year}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">{invoice.description}</p>
                      <div className="flex space-x-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/providers/${invoice.provider_id}/invoices/${invoice.id}`)}
                        >
                          Ver detalles
                        </Button>
                        {invoice.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => handleStatusChange(invoice.id, 'paid')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como pagada
                          </Button>
                        )}
                        {invoice.status === 'paid' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChange(invoice.id, 'pending')}
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
