import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import SuccessModal from '../../components/ui/SuccessModal';

interface Provider {
  id: string;
  name: string;
}

interface Condominium {
  id: string;
  name: string;
}


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

export default function CreateProviderInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    amount: '',
    description: '',
    condominium_id: '',
    receipt_url: '',
    payment_method: 'transfer',
    month: new Date().getMonth() + 1,
    year: currentYear,
    status: 'pending',
    category: 'expensas_ordinarias_a' // Categoría por defecto
  });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('id, name')
        .eq('id', id)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      // Primero obtener los IDs de los consorcios asociados al proveedor
      const { data: providerCondominiums, error: providerCondominiumsError } = await supabase
        .from('provider_condominiums')
        .select('condominium_id')
        .eq('provider_id', id);

      if (providerCondominiumsError) throw providerCondominiumsError;

      if (providerCondominiums && providerCondominiums.length > 0) {
        const condominiumIds = providerCondominiums.map(pc => pc.condominium_id);
        
        // Luego obtener los detalles de los consorcios
        const { data: condominiumsData, error: condominiumsError } = await supabase
          .from('condominiums')
          .select('id, name')
          .in('id', condominiumIds);

        if (condominiumsError) throw condominiumsError;

        if (condominiumsData) {
          setCondominiums(condominiumsData as Condominium[]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'month' || name === 'year' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validar que se haya seleccionado un consorcio
      if (!formData.condominium_id) {
        throw new Error('Debe seleccionar un consorcio');
      }

      // Validar que el monto sea un número válido
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número mayor a cero');
      }

      // Validar fechas
      const invoiceDate = new Date(formData.invoice_date);
      const dueDate = new Date(formData.due_date);
      
      if (isNaN(invoiceDate.getTime())) {
        throw new Error('Fecha de factura inválida');
      }
      
      if (isNaN(dueDate.getTime())) {
        throw new Error('Fecha de vencimiento inválida');
      }

      // Insertar la factura
      const { data: invoiceData, error: insertError } = await supabase
        .from('provider_invoices')
        .insert([{
          provider_id: id,
          invoice_number: formData.invoice_number,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          amount: amount,
          description: formData.description,
          condominium_id: formData.condominium_id,
          receipt_url: formData.receipt_url || null,
          payment_method: formData.payment_method,
          month: formData.month,
          year: formData.year,
          status: formData.status,
          category: formData.category // Añadimos la categoría
        }])
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!invoiceData) throw new Error('No se pudo crear la factura');

      // Si el estado es 'paid', crear automáticamente el gasto asociado
      if (formData.status === 'paid') {
        await createExpenseFromInvoice(invoiceData.id, amount, formData.condominium_id);
      }

      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la factura');
      console.error('Error en handleSubmit:', err);
    } finally {
      setSaving(false);
    }
  };

  // Función para crear un gasto a partir de una factura pagada
  const createExpenseFromInvoice = async (invoiceId: string, amount: number, condominiumId: string) => {
    try {
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('name')
        .eq('id', id)
        .single();

      if (providerError) throw providerError;
      if (!providerData) throw new Error('Proveedor no encontrado');

      const expenseData = {
        amount: amount,
        description: `Pago a proveedor: ${providerData.name}`,
        date: formData.invoice_date,
        month: formData.month,
        year: formData.year,
        condominium_id: condominiumId,
        provider_invoice_id: invoiceId,
        status: 'completed',
        category: formData.category, // Usamos la categoría seleccionada en el formulario
        payment_method: formData.payment_method,
      };

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([expenseData]);

      if (expenseError) throw expenseError;
      
      console.log('Gasto creado exitosamente para la factura:', invoiceId);
    } catch (err) {
      console.error('Error al crear el gasto:', err);
      // No hacemos throw aquí para no interrumpir el flujo principal
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
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
            onClick={() => navigate(`/providers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Nueva Factura</h1>
            <p className="text-sm text-gray-500">Proveedor: {provider.name}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Factura</CardTitle>
            <CardDescription>Complete los datos de la factura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="condominium_id" className="block text-sm font-medium text-gray-700">
                Consorcio
              </label>
              <select
                id="condominium_id"
                name="condominium_id"
                value={formData.condominium_id}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                required
              >
                <option value="">Seleccione un consorcio</option>
                {condominiums.map(condo => (
                  <option key={condo.id} value={condo.id}>
                    {condo.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                  Mes
                </label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
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
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Año
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  required
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
              value={formData.invoice_number}
              onChange={handleChange}
              required
            />

            <Input
              label="Fecha de Factura"
              name="invoice_date"
              type="date"
              value={formData.invoice_date}
              onChange={handleChange}
              required
            />

            <Input
              label="Fecha de Vencimiento"
              name="due_date"
              type="date"
              value={formData.due_date}
              onChange={handleChange}
              required
            />

            <Input
              label="Monto"
              name="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              required
            />

            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
                Método de Pago
              </label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
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
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
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
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <Input
              label="URL del Comprobante"
              name="receipt_url"
              type="url"
              value={formData.receipt_url}
              onChange={handleChange}
              placeholder="https://"
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/providers/${id}`)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar Factura'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate(`/providers/${id}`);
        }}
        message="La factura ha sido creada exitosamente"
      />
    </div>
  );
}