import { supabase } from '../lib/supabaseClient';

/**
 * Función para obtener los pagos de empleados asociados a un consorcio específico
 * Utiliza la tabla de unión employee_condominiums para encontrar los empleados asociados
 * y luego consulta sus pagos
 */
export const fetchEmployeePayments = async (condominiumId: string) => {
  if (!condominiumId) {
    console.log('No hay consorcio seleccionado');
    return { data: [], error: new Error('No hay consorcio seleccionado') };
  }
  
  try {
    console.log('Obteniendo empleados asociados al consorcio:', condominiumId);
    
    // Paso 1: Obtener los IDs de empleados asociados a este consorcio
    const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
      .from('employee_condominiums')
      .select('employee_id')
      .eq('condominium_id', condominiumId);
    
    if (employeeCondominiumsError) {
      console.error('Error al obtener relaciones empleado-consorcio:', employeeCondominiumsError);
      return { data: [], error: employeeCondominiumsError };
    }
    
    const employeeIds = employeeCondominiums?.map(ec => ec.employee_id) || [];
    console.log('IDs de empleados encontrados para este consorcio:', employeeIds);
    
    if (employeeIds.length === 0) {
      console.log('No se encontraron empleados asociados a este consorcio');
      return { data: [], error: null };
    }
    
    // Paso 2: Obtener los pagos de esos empleados
    console.log('Buscando pagos para los empleados:', employeeIds);
    const { data: payments, error: paymentsError } = await supabase
      .from('employee_payments')
      .select('*, employee:employees(name, position)')
      .in('employee_id', employeeIds)
      .eq('status', 'paid')
      .order('payment_date', { ascending: false });
    
    if (paymentsError) {
      console.error('Error al obtener pagos de empleados:', paymentsError);
      return { data: [], error: paymentsError };
    }
    
    console.log('Pagos de empleados encontrados:', payments?.length || 0, payments);
    return { data: payments || [], error: null };
  } catch (err) {
    console.error('Error al cargar pagos de empleados:', err);
    return { data: [], error: err instanceof Error ? err : new Error('Error desconocido') };
  }
};

/**
 * Función para obtener las relaciones entre empleados y consorcios
 */
export const fetchEmployeeCondominiums = async (condominiumId: string) => {
  if (!condominiumId) {
    return { data: [], error: new Error('No hay consorcio seleccionado') };
  }
  
  try {
    console.log('Buscando relaciones empleado-consorcio para:', condominiumId);
    
    const { data, error } = await supabase
      .from('employee_condominiums')
      .select('*')
      .eq('condominium_id', condominiumId);

    if (error) {
      console.error('Error al cargar relaciones empleado-consorcio:', error);
      return { data: [], error };
    }
    
    console.log('Relaciones empleado-consorcio encontradas:', data?.length || 0, data);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error al cargar relaciones empleado-consorcio:', err);
    return { data: [], error: err instanceof Error ? err : new Error('Error desconocido') };
  }
};

/**
 * Función para calcular el total de salarios pagados
 */
export const calculateTotalSalaries = (payments: any[]) => {
  if (!payments || payments.length === 0) {
    return 0;
  }
  
  return payments.reduce((sum, payment) => sum + (payment.total_amount || 0), 0);
};

/**
 * Función para filtrar pagos por período (mes y año)
 */
export const filterPaymentsByPeriod = (payments: any[], month: number | null, year: number | null) => {
  if (!payments || payments.length === 0) {
    return [];
  }
  
  return payments.filter(payment => {
    const monthMatch = month === null || payment.month === month;
    const yearMatch = year === null || payment.year === year;
    return monthMatch && yearMatch;
  });
};
