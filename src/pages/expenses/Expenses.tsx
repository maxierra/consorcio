import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, Building, Receipt, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';

interface Condominium {
  id: string;
  name: string;
}

interface BaseExpense {
  id: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  description: string;
  type: 'provider_invoice' | 'employee_payment';
  status: 'pending' | 'paid' | 'cancelled';
  condominium: Condominium;
  paymentType: string;
}

interface ProviderInvoice extends BaseExpense {
  type: 'provider_invoice';
  invoice_number: string;
  due_date: string;
  category?: string;
  provider: {
    id: string;
    name: string;
  };
}

interface EmployeePayment extends BaseExpense {
  type: 'employee_payment';
  employee: { id: string; name: string };
  paymentType: 'employee_salary';
  invoice_number: string;
  due_date: string;
  provider: { id: string; name: string };
}

type Expense = ProviderInvoice | EmployeePayment;

interface ExpenseGroup {
  expenses: Expense[];
  total: number;
  totalOrdinariaA: number;
  totalOrdinariaB: number;
  totalAysa: number;
}

interface GroupedExpenses {
  [condominiumId: string]: {
    name: string;
    periods: {
      [key: string]: ExpenseGroup;
    };
  };
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedExpenses, setGroupedExpenses] = useState<GroupedExpenses>({});
  const [expandedCondominiums, setExpandedCondominiums] = useState<string[]>([]);
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>([]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      console.log('Iniciando carga de gastos...');
      
      // Obtener facturas de proveedores
      console.log('Obteniendo facturas de proveedores...');
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('provider_invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          amount,
          status,
          month,
          year,
          category,
          provider:providers(id, name),
          condominium:condominiums!inner(id, name)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;



      // Obtener compensaciones de empleados con relaciones
      console.log('Obteniendo compensaciones de empleados...');
      
      // 1. Primero obtenemos las compensaciones con la información del empleado
      // y su relación con el condominio a través de la tabla de empleados
      const { data: compensations, error: compensationsError } = await supabase
        .from('employee_compensations')
        .select(`
          *,
          employee:employees(
            id, 
            name,
            employee_condominiums!inner(condominium_id)
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('Compensaciones obtenidas:', compensations);
      
      if (compensationsError) {
        console.error('Error al obtener compensaciones de empleados:', compensationsError);
        throw compensationsError;
      }
      
      // Mapear las compensaciones al formato de pagos de empleados
      const employeePayments = (compensations || []).map(comp => {
        try {
          // Asegurarnos de que el mes y año sean números
          let month = parseInt(comp.month, 10);
          let year = parseInt(comp.year, 10);
          
          // Verificar si el mes es 0 (enero) o 12 (diciembre) para ajustar el año si es necesario
          if (month < 1) {
            month = 12;
            year--;
          } else if (month > 12) {
            month = 1;
            year++;
          }
          
          // Usar el primer día del mes para la fecha de pago
          const paymentDate = new Date(year, month - 1, 1);
          
          // Formatear la fecha como YYYY-MM-DD
          const formattedDate = `${year}-${String(month).padStart(2, '0')}-01`;
          
          console.log('Procesando compensación:', {
            id: comp.id,
            originalMonth: comp.month,
            originalYear: comp.year,
            processedMonth: month,
            processedYear: year,
            formattedDate,
            originalDate: paymentDate.toString()
          });
          
          return {
            id: comp.id,
            employee_id: comp.employee_id,
            amount: comp.total_compensation,
            payment_date: formattedDate,
            month: month,  // Usar el mes corregido
            year: year,    // Usar el año corregido
            created_at: comp.created_at,
            status: 'paid',
            description: `Compensación ${String(month).padStart(2, '0')}/${year}`,
            employee: comp.employee,
            condominium_id: comp.employee?.employee_condominiums?.[0]?.condominium_id,
            type: 'employee_compensation',
            paymentType: 'employee_salary',
            invoice_number: `EMP-${comp.id}`,
            due_date: formattedDate,
            provider: {
              id: 'employee',
              name: 'Nómina'
            }
          };
        } catch (error) {
          console.error('Error procesando compensación:', {
            id: comp.id,
            error,
            comp
          });
          return null;
        }
      }).filter(Boolean); // Filtrar cualquier compensación nula por errores
      
      console.log('Pagos de empleados procesados:', employeePayments);

      // Si hay pagos, obtener la información de los empleados
      const employeeIds = [...new Set(employeePayments.map(p => p.employee_id))];
      
      if (employeeIds.length > 0) {
        console.log('Obteniendo información de', employeeIds.length, 'empleados...');
        
        const { error: employeesError } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', employeeIds);
          
        if (employeesError) {
          console.error('Error al cargar información de empleados:', employeesError);
          // No lanzamos el error para que la aplicación siga funcionando
          console.warn('Continuando sin información de empleados');
        }
      }

      // El manejo de errores ahora se hace en cada consulta individual

      // Obtener información de los condominios
      const { data: condominiumsData, error: condominiumsError } = await supabase
        .from('condominiums')
        .select('id, name');

      if (condominiumsError) {
        console.error('Error al cargar información de condominios:', condominiumsError);
        throw condominiumsError;
      }

      const condominiumsMap = new Map<string, { id: string; name: string }>(
        (condominiumsData || []).map(c => [c.id, { id: c.id, name: c.name }])
      );

      // Mapear los pagos de empleados
      console.log('Procesando pagos de empleados...');
      const employeeExpenses: EmployeePayment[] = [];
      
      for (const payment of employeePayments) {
        if (!payment) continue; // Saltar pagos nulos
        
        try {
          console.log('Procesando pago de empleado:', payment);
          
          if (!payment.condominium_id) {
            console.warn(`Pago ${payment.id} no tiene condominio asignado`);
            continue;
          }
          
          const condominium = condominiumsMap.get(payment.condominium_id);
          if (!condominium) {
            console.warn(`No se encontró el condominio para el pago ${payment.id}`);
            continue;
          }
          
          const expense: EmployeePayment = {
            id: `emp_${payment.id}`,
            amount: payment.amount,
            date: payment.payment_date,
            description: payment.description,
            status: 'paid',
            month: payment.month,
            year: payment.year,
            condominium: {
              id: condominium.id,
              name: condominium.name
            },
            type: 'employee_payment',
            employee: payment.employee || { id: payment.employee_id, name: 'Empleado' },
            paymentType: 'employee_salary',
            invoice_number: `EMP-${payment.id}`,
            due_date: payment.payment_date,
            provider: {
              id: 'employee',
              name: 'Nómina'
            }
          };
          
          employeeExpenses.push(expense);
        } catch (error) {
          console.error(`Error procesando pago ${payment.id}:`, error);
        }
      }
      
      // Procesar facturas de proveedores
      console.log('Datos completos de facturas:', invoicesData);
      
      const processedInvoices = (invoicesData || [])
        .filter(invoice => invoice.condominium)
        .map(invoice => {
          // Asegurarse de que condominium sea un objeto y no un array
          const condominium = (Array.isArray(invoice.condominium) ? invoice.condominium[0] : invoice.condominium) as { id: string; name: string };
          
          // Asegurarse de que el proveedor tenga el formato correcto
          const provider = invoice.provider 
            ? (Array.isArray(invoice.provider) ? invoice.provider[0] : invoice.provider)
            : { id: 'unknown', name: 'Proveedor desconocido' };
          
          // Depurar la categoría de la factura
          console.log(`Factura ${invoice.id} - ${invoice.invoice_number}:`, {
            categoria: invoice.category,
            monto: invoice.amount,
            fecha: invoice.invoice_date,
            proveedor: provider?.name
          });
          
          const providerInvoice: ProviderInvoice = {
            id: `inv_${invoice.id}`,
            amount: invoice.amount,
            date: invoice.invoice_date,
            description: `Factura ${invoice.invoice_number}${provider ? ` - ${provider.name}` : ''}`,
            status: invoice.status as 'pending' | 'paid' | 'cancelled',
            month: invoice.month,
            year: invoice.year,
            category: invoice.category,
            condominium: {
              id: condominium.id,
              name: typeof condominium.name === 'string' ? condominium.name : 'Condominio sin nombre'
            },
            type: 'provider_invoice',
            invoice_number: invoice.invoice_number,
            due_date: invoice.due_date,
            provider: {
              id: provider?.id || 'unknown',
              name: typeof provider?.name === 'string' ? provider.name : 'Proveedor desconocido'
            },
            paymentType: 'provider_invoice'
          };
          return providerInvoice;
        });

      // Combinar todos los gastos
      console.log('Resumen de gastos antes de agrupar:');
      console.log('- Total facturas de proveedores:', processedInvoices.length);
      console.log('- Total pagos de empleados:', employeeExpenses.length);
      
      const allExpenses = [...employeeExpenses, ...processedInvoices] as Array<ProviderInvoice | EmployeePayment>;
      
      console.log('Total de gastos combinados:', allExpenses.length);

      // Crear la estructura de datos agrupada
      // Convertir la estructura agrupada al formato esperado por el estado
      const grouped: GroupedExpenses = {};

      // Agrupar por consorcio y período
      console.log('Agrupando gastos por consorcio y período...');
      allExpenses.forEach((expense, index) => {
        console.log(`Procesando gasto ${index + 1}:`, {
          type: expense.type,
          id: expense.id,
          condominium: expense.condominium?.name,
          amount: expense.amount,
          date: expense.date
        });
        const condoId = expense.condominium.id;
        const periodKey = `${expense.year}-${expense.month.toString().padStart(2, '0')}`;

        // Inicializar el condominio si no existe
        if (!grouped[condoId]) {
          grouped[condoId] = {
            name: expense.condominium.name,
            periods: {}
          };
        }


        // Inicializar el período si no existe
        if (!grouped[condoId].periods[periodKey]) {
          grouped[condoId].periods[periodKey] = {
            expenses: [],
            total: 0,
            totalOrdinariaA: 0,
            totalOrdinariaB: 0,
            totalAysa: 0
          };
        }

        // Agregar el gasto al período correspondiente
        grouped[condoId].periods[periodKey].expenses.push(expense);
        grouped[condoId].periods[periodKey].total += expense.amount;
        
        // Calcular totales por categoría
        if (expense.type === 'provider_invoice') {
          // Para facturas de proveedores, usar la categoría asignada
          console.log(`Asignando categoría para gasto ${expense.id}:`, {
            tipo: expense.type,
            categoria: expense.category,
            monto: expense.amount,
            condoId,
            periodKey
          });
          
          // Normalizar la categoría para comparación (convertir a minúsculas y eliminar guiones bajos)
          const categoryNormalized = expense.category ? expense.category.toLowerCase().replace(/_/g, ' ') : '';
          console.log(`Categoría normalizada: "${categoryNormalized}"`);
          
          if (!expense.category || categoryNormalized === 'expensas ordinarias a') {
            // Si no tiene categoría o es Expensas Ordinarias A
            console.log(`Asignando a Ordinarias A: ${expense.amount}`);
            grouped[condoId].periods[periodKey].totalOrdinariaA += expense.amount;
          } else if (categoryNormalized === 'expensas ordinarias b') {
            console.log(`Asignando a Ordinarias B: ${expense.amount}`);
            grouped[condoId].periods[periodKey].totalOrdinariaB += expense.amount;
          } else if (categoryNormalized === 'expensas aysa') {
            console.log(`Asignando a Aysa: ${expense.amount}`);
            grouped[condoId].periods[periodKey].totalAysa += expense.amount;
          } else {
            // Si la categoría no coincide con ninguna de las esperadas
            console.warn(`Categoría no reconocida: "${expense.category}" (normalizada: "${categoryNormalized}"). Asignando a Ordinarias A por defecto.`);
            grouped[condoId].periods[periodKey].totalOrdinariaA += expense.amount;
          }
        } else if (expense.type === 'employee_payment') {
          // Temporalmente asignar pagos de empleados a Expensas Ordinarias A
          console.log(`Asignando pago de empleado a Ordinarias A: ${expense.amount}`);
          grouped[condoId].periods[periodKey].totalOrdinariaA += expense.amount;
        }
      });

      // Ordenar los gastos dentro de cada período (primero facturas, luego pagos de empleados)
      Object.values(grouped).forEach(condo => {
        Object.values(condo.periods).forEach(period => {
          period.expenses.sort((a, b) => {
            if (a.type === b.type) return 0;
            return a.type === 'provider_invoice' ? -1 : 1;
          });
        });
      });

      console.log('Estructura final agrupada:', JSON.stringify(grouped, null, 2));
      setGroupedExpenses(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  const toggleCondominium = (condominiumId: string) => {
    setExpandedCondominiums(prev =>
      prev.includes(condominiumId)
        ? prev.filter(id => id !== condominiumId)
        : [...prev, condominiumId]
    );
  };

  const togglePeriod = (periodKey: string) => {
    setExpandedPeriods(prev =>
      prev.includes(periodKey)
        ? prev.filter(key => key !== periodKey)
        : [...prev, periodKey]
    );
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
        <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
        <Link to="/expenses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Gasto
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groupedExpenses).map(([condominiumId, condominium]) => (
          <Card key={condominiumId} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleCondominium(condominiumId)}
            >
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold">{condominium.name}</h2>
              </div>
              {expandedCondominiums.includes(condominiumId) ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </div>

            {expandedCondominiums.includes(condominiumId) && (
              <div className="p-4 space-y-4">
                {Object.entries(condominium.periods).map(([period, data]) => {
                  const [year, month] = period.split('-');
                  const periodKey = `${condominiumId}-${period}`;
                  const monthName = MONTHS[parseInt(month) - 1];

                  return (
                    <div key={period} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                        onClick={() => togglePeriod(periodKey)}
                      >
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {monthName} {year}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center space-x-4">
                            <span className="font-medium text-gray-700">
                              Total: {formatCurrency(data.total)}
                            </span>
                            {expandedPeriods.includes(periodKey) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div className="text-sm mt-1 text-gray-600 flex flex-col items-end">
                            <div className="flex space-x-2">
                              <span className="font-medium text-blue-600">Ordinarias A:</span>
                              <span>{formatCurrency(data.totalOrdinariaA)}</span>
                            </div>
                            <div className="flex space-x-2">
                              <span className="font-medium text-green-600">Ordinarias B:</span>
                              <span>{formatCurrency(data.totalOrdinariaB)}</span>
                            </div>
                            <div className="flex space-x-2">
                              <span className="font-medium text-purple-600">Aysa:</span>
                              <span>{formatCurrency(data.totalAysa)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedPeriods.includes(periodKey) && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Tipo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Descripción
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {data.expenses[0]?.type === 'provider_invoice' ? 'Vencimiento' : 'Responsable'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Monto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Estado
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {data.expenses.map((expense) => (
                                <tr
                                  key={expense.id}
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => {
                                    if (expense.type === 'provider_invoice') {
                                      window.location.href = `/providers/${expense.provider.id}/invoices/${expense.id}`;
                                    } else if (expense.type === 'employee_payment') {
                                      window.location.href = `/employees/${expense.employee.id}/payments`;
                                    }
                                  }}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    <div className="flex items-center space-x-2">
                                      {expense.type === 'provider_invoice' ? (
                                        <Receipt className="h-4 w-4 text-blue-500" />
                                      ) : (
                                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                      )}
                                      <span>{expense.type === 'provider_invoice' ? 'Factura' : 'Sueldo'}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {expense.description}
                                    {expense.type === 'employee_payment' && expense.employee && (
                                      <div className="text-xs text-gray-400">
                                        {expense.employee.name}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(expense.date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {expense.type === 'provider_invoice' ? (
                                      new Date(expense.due_date).toLocaleDateString()
                                    ) : (
                                      expense.employee?.name || 'N/A'
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatCurrency(expense.amount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge variant={getStatusBadgeVariant(expense.status)}>
                                      {expense.status === 'paid' ? 'Pagado' :
                                       expense.status === 'pending' ? 'Pendiente' :
                                       'Cancelado'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}