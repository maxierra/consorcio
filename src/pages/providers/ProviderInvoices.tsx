import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Calendar, DollarSign, Clock, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';

interface Provider {
  id: string;
  name: string;
  tax_id: string;
}

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

export default function ProviderInvoices() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderData();
  }, [id]);

  const fetchProviderData = async () => {
    try {
      // Fetch provider details
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('id, name, tax_id')
        .eq('id', id)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      // Fetch provider invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('provider_invoices')
        .select(`
          *,
          condominium:condominiums(name)
        `)
        .eq('provider_id', id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-4">
        <div className="bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded">
          Proveedor no encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{provider.name}</h1>
            {provider.tax_id && (
              <p className="text-sm text-gray-500">CUIT: {provider.tax_id}</p>
            )}
          </div>
        </div>
        <Button onClick={() => navigate(`/providers/${id}/invoices/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay facturas</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comience agregando una nueva factura para este proveedor.
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate(`/providers/${id}/invoices/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Factura
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consorcio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comprobante
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/providers/${id}/invoices/${invoice.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {MONTHS[invoice.month - 1]} {invoice.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.condominium.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getCategoryLabel(invoice.category || 'expensas_ordinarias_a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status === 'paid' ? 'Pagada' :
                           invoice.status === 'pending' ? 'Pendiente' :
                           'Cancelada'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.receipt_url ? (
                          <a
                            href={invoice.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-900"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Receipt className="h-4 w-4" />
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}