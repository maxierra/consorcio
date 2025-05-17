import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency } from '../../lib/utils';

interface Payment {
  id?: string;
  condominium_id: string;
  unit_id: string;
  month: number;
  year: number;
  amount: number;
  payment_date?: string;
  regularized: boolean;
  regularization_date?: string;
  unit_number?: string;
  owner_name?: string;
  // Para identificar si es un período sin pago
  isPeriodWithoutPayment?: boolean;
}

interface PaymentHistoryProps {
  condominiumId: string;
  unitId?: string; // Opcional, si no se provee muestra todos los pagos del consorcio
}

interface Period {
  month: number;
  year: number;
}

const getMonthName = (month: number) => {
  const date = new Date();
  date.setMonth(month - 1);
  return date.toLocaleString('es-ES', { month: 'long' });
};

export const PaymentHistory = ({ condominiumId, unitId }: PaymentHistoryProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Obtener la unidad si se especifica un unitId
        let unitInfo = null;
        if (unitId) {
          const { data: unitData, error: unitError } = await supabase
            .from('units')
            .select('id, number, owner_name')
            .eq('id', unitId)
            .single();

          if (unitError) throw unitError;
          unitInfo = unitData;
        }

        // 2. Obtener todos los pagos registrados
        let query = supabase
          .from('expense_payments')
          .select(`
            *,
            units:unit_id (
              number,
              owner_name
            )
          `)
          .eq('condominium_id', condominiumId)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        // Si se especifica una unidad, filtrar por ella
        if (unitId) {
          query = query.eq('unit_id', unitId);
        }

        const { data: paymentsData, error: paymentsError } = await query;

        if (paymentsError) throw paymentsError;

        // 3. Obtener todos los períodos disponibles para el consorcio
        // Primero obtenemos las facturas de proveedores para identificar períodos
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('provider_invoices')
          .select('month, year')
          .eq('condominium_id', condominiumId)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (invoicesError) throw invoicesError;

        // Luego obtenemos las compensaciones de empleados para identificar más períodos
        // Primero obtenemos los empleados asociados al consorcio
        const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
          .from('employee_condominiums')
          .select('employee_id')
          .eq('condominium_id', condominiumId);

        if (employeeCondominiumsError) throw employeeCondominiumsError;

        let employeeCompensations: any[] = [];
        if (employeeCondominiums && employeeCondominiums.length > 0) {
          const employeeIds = employeeCondominiums.map(ec => ec.employee_id);
          
          const { data: compensationsData, error: compensationsError } = await supabase
            .from('employee_compensations')
            .select('month, year')
            .in('employee_id', employeeIds);

          if (compensationsError) throw compensationsError;
          employeeCompensations = compensationsData || [];
        }

        // 4. Combinar todos los períodos únicos
        const uniquePeriods = new Map<string, Period>();
        
        // Agregar períodos de facturas
        invoicesData?.forEach(invoice => {
          const key = `${invoice.year}-${invoice.month}`;
          if (!uniquePeriods.has(key)) {
            uniquePeriods.set(key, { month: invoice.month, year: invoice.year });
          }
        });

        // Agregar períodos de compensaciones
        employeeCompensations?.forEach(comp => {
          const key = `${comp.year}-${comp.month}`;
          if (!uniquePeriods.has(key)) {
            uniquePeriods.set(key, { month: comp.month, year: comp.year });
          }
        });

        // Agregar períodos de pagos existentes
        paymentsData?.forEach(payment => {
          const key = `${payment.year}-${payment.month}`;
          if (!uniquePeriods.has(key)) {
            uniquePeriods.set(key, { month: payment.month, year: payment.year });
          }
        });

        // 5. Convertir los pagos existentes a nuestro formato
        const formattedPayments = paymentsData?.map(payment => ({
          ...payment,
          unit_number: payment.units?.number || unitInfo?.number,
          owner_name: payment.units?.owner_name || unitInfo?.owner_name,
          isPeriodWithoutPayment: false
        })) || [];

        // 6. Para cada período único, verificar si existe un pago para la unidad
        let allPayments = [...formattedPayments];
        
        if (unitId) {
          // Solo agregar períodos sin pagos si estamos viendo una unidad específica
          const periodsArray = Array.from(uniquePeriods.values());
          
          for (const period of periodsArray) {
            const paymentExists = formattedPayments.some(
              p => p.month === period.month && p.year === period.year
            );
            
            if (!paymentExists) {
              // Agregar un período sin pago
              allPayments.push({
                condominium_id: condominiumId,
                unit_id: unitId,
                month: period.month,
                year: period.year,
                amount: 0,
                regularized: false,
                unit_number: unitInfo?.number,
                owner_name: unitInfo?.owner_name,
                isPeriodWithoutPayment: true
              });
            }
          }
        }

        // 7. Ordenar todos los pagos por año y mes
        allPayments.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });

        setPayments(allPayments);
      } catch (error) {
        console.error('Error al cargar historial de pagos:', error);
        setError('Error al cargar el historial de pagos');
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [condominiumId, unitId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          Historial de Pagos
          {unitId && payments[0]?.unit_number && (
            <span className="ml-2 text-gray-600">
              - Unidad {payments[0].unit_number}
            </span>
          )}
        </h2>
      </div>

      {payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {!unitId && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Propietario
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Importe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment, index) => (
                <tr key={payment.id || `period-${payment.year}-${payment.month}-${index}`}>
                  {!unitId && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.unit_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.owner_name}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getMonthName(payment.month)} {payment.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {payment.isPeriodWithoutPayment ? 
                      <span className="text-gray-400">No registrado</span> : 
                      formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.payment_date ? 
                      new Date(payment.payment_date).toLocaleString() : 
                      <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payment.isPeriodWithoutPayment ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Sin pago
                      </span>
                    ) : payment.regularized ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Regularizado
                        {payment.regularization_date && (
                          <span className="ml-1 text-green-600">
                            ({new Date(payment.regularization_date).toLocaleDateString()})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pendiente de regularización
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-gray-500">
          No se encontraron pagos registrados
        </div>
      )}
    </div>
  );
};
