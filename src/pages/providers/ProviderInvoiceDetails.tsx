import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Trash2, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';
import SuccessModal from '../../components/ui/SuccessModal';
import { formatCurrency } from '../../lib/utils';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'online', label: 'Pago Online' },
  { value: 'debit', label: 'Débito Automático' }
];

const INVOICE_CATEGORIES = [
  { value: 'expensas_ordinarias_a', label: 'Expensas Ordinarias A' },
  { value: 'expensas_ordinarias_b', label: 'Expensas Ordinarias B' },
  { value: 'expensas_aysa', label: 'Expensas Aysa' },
  { value: 'otros', label: 'Otros' }
];

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

interface ProviderInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: 'cash' | 'transfer' | 'online' | 'debit';
  receipt_url: string | null;
  month: number;
  year: number;
  category: string;
  provider: {
    name: string;
  };
  condominium: {
    name: string;
  };
}

export default function ProviderInvoiceDetails() {
  const { providerId, invoiceId } = useParams<{ providerId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<ProviderInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Get current year and create array of years (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [editForm, setEditForm] = useState({
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    amount: '',
    description: '',
    status: '',
    payment_method: '',
    receipt_url: '',
    month: 1,
    year: currentYear,
    category: 'expensas_ordinarias_a' // Valor predeterminado
  });

  useEffect(() => {
    fetchInvoiceDetails();
  }, [providerId, invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_invoices')
        .select('*, provider:providers(name), condominium:condominiums(name)')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      setInvoice(data);
      setEditForm({
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        amount: data.amount.toString(),
        description: data.description || '',
        status: data.status,
        payment_method: data.payment_method,
        receipt_url: data.receipt_url || '',
        month: data.month,
        year: data.year,
        category: data.category || 'expensas_ordinarias_a' // Usar la categoría existente o valor predeterminado
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'month' || name === 'year' ? parseInt(value) : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('provider_invoices')
        .update({
          invoice_number: editForm.invoice_number,
          invoice_date: editForm.invoice_date,
          due_date: editForm.due_date,
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          status: editForm.status,
          payment_method: editForm.payment_method,
          receipt_url: editForm.receipt_url || null,
          month: editForm.month,
          year: editForm.year,
          category: editForm.category // Incluir la categoría en la actualización
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      await fetchInvoiceDetails();
      setIsEditing(false);
      setSuccessMessage('Factura actualizada exitosamente');
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la factura');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error: deleteError } = await supabase
        .from('provider_invoices')
        .delete()
        .eq('id', invoiceId);

      if (deleteError) throw deleteError;

      setShowDeleteModal(false);
      navigate(`/providers/${providerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la factura');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from('provider_invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      await fetchInvoiceDetails();
      setSuccessMessage('Estado de la factura actualizado');
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el estado');
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHODS.find(m => m.value === method)?.label || method;
  };

  const getMonthLabel = (monthNumber: number) => {
    return MONTHS.find(m => m.value === monthNumber)?.label || monthNumber;
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

  if (!invoice) {
    return (
      <div className="p-4">
        <div className="bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded">
          Factura no encontrada
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
            onClick={() => navigate(`/providers/${providerId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Factura {invoice.invoice_number}
            </h1>
            <p className="text-sm text-gray-500">
              Proveedor: {invoice.provider.name}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Factura</CardTitle>
            <CardDescription>Información general de la factura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Mes
                    </label>
                    <select
                      name="month"
                      value={editForm.month}
                      onChange={handleChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                      {MONTHS.map(month => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Año
                    </label>
                    <select
                      name="year"
                      value={editForm.year}
                      onChange={handleChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input
                  label="Número de Factura"
                  name="invoice_number"
                  value={editForm.invoice_number}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Fecha de Factura"
                  name="invoice_date"
                  type="date"
                  value={editForm.invoice_date}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Fecha de Vencimiento"
                  name="due_date"
                  type="date"
                  value={editForm.due_date}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Monto"
                  name="amount"
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={handleChange}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Método de Pago
                  </label>
                  <select
                    name="payment_method"
                    value={editForm.payment_method}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    required
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Categoría
                  </label>
                  <select
                    name="category"
                    value={editForm.category}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    required
                  >
                    {INVOICE_CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <Input
                  label="URL del Comprobante"
                  name="receipt_url"
                  type="url"
                  value={editForm.receipt_url}
                  onChange={handleChange}
                  placeholder="https://"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </>
            ) : (
              <dl className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Período</dt>
                  <dd className="text-sm text-gray-900">
                    {getMonthLabel(invoice.month)} {invoice.year}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Consorcio</dt>
                  <dd className="text-sm text-gray-900">{invoice.condominium.name}</dd>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Fecha de Factura</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Fecha de Vencimiento</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Monto</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.amount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Método de Pago</dt>
                  <dd className="text-sm text-gray-900">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                      {getPaymentMethodLabel(invoice.payment_method)}
                    </div>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Categoría</dt>
                  <dd className="text-sm text-gray-900">
                    {getCategoryLabel(invoice.category || 'expensas_ordinarias_a')}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="text-sm text-gray-900">
                    <Badge
                      variant={
                        invoice.status === 'paid' ? 'success' :
                        invoice.status === 'pending' ? 'warning' :
                        'danger'
                      }
                    >
                      {invoice.status === 'paid' ? 'Pagada' :
                       invoice.status === 'pending' ? 'Pendiente' :
                       'Cancelada'}
                    </Badge>
                  </dd>
                </div>
                {invoice.receipt_url && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <dt className="text-sm font-medium text-gray-500">Comprobante</dt>
                    <dd className="text-sm text-gray-900">
                      <a
                        href={invoice.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Receipt className="h-4 w-4 mr-1" />
                        Ver comprobante
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>

        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Cambiar estado de la factura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Button
                  variant={invoice.status === 'paid' ? 'outline' : 'primary'}
                  onClick={() => handleStatusChange('paid')}
                  disabled={invoice.status === 'paid'}
                >
                  Marcar como Pagada
                </Button>
                <Button
                  variant={invoice.status === 'pending' ? 'outline' : 'primary'}
                  onClick={() => handleStatusChange('pending')}
                  disabled={invoice.status === 'pending'}
                >
                  Marcar como Pendiente
                </Button>
                <Button
                  variant={invoice.status === 'cancelled' ? 'outline' : 'danger'}
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={invoice.status === 'cancelled'}
                >
                  Marcar como Cancelada
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="¿Eliminar factura?"
        message="Esta acción eliminará permanentemente la factura. Esta acción no se puede deshacer."
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </div>
  );
}