import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface EmployeePayment {
  id: string;
  employee_id: string;
  condominium_id: string;
  month: number;
  year: number;
  base_salary: number;
  social_security: number;
  union_fee: number;
  additional_hours: number;
  bonuses: number;
  deductions: number;
  total_amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  employee?: {
    name: string;
    position: string;
  }
}

interface EmployeeCondominium {
  id: string;
  employee_id: string;
  condominium_id: string;
}

export default function EmployeePaymentsDebugger() {
  const [condominiums, setCondominiums] = useState<any[]>([]);
  const [selectedCondominium, setSelectedCondominium] = useState<string | null>(null);
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>([]);
  const [employeeCondominiums, setEmployeeCondominiums] = useState<EmployeeCondominium[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cargar la lista de condominios al iniciar
    fetchCondominiums();
  }, []);

  useEffect(() => {
    if (selectedCondominium) {
      // Cuando se selecciona un consorcio, buscar sus empleados y pagos
      fetchEmployeeCondominiums();
      fetchEmployeePayments();
    }
  }, [selectedCondominium]);

  const fetchCondominiums = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name, address')
        .order('name');

      if (error) throw error;
      
      console.log('Condominios cargados:', data?.length || 0);
      setCondominiums(data || []);
      
      // Seleccionar el primer consorcio por defecto
      if (data && data.length > 0) {
        setSelectedCondominium(data[0].id);
      }
    } catch (err) {
      console.error('Error al cargar condominios:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar condominios');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeCondominiums = async () => {
    if (!selectedCondominium) return;
    
    try {
      setLoading(true);
      console.log('Buscando relaciones empleado-consorcio para:', selectedCondominium);
      
      const { data, error } = await supabase
        .from('employee_condominiums')
        .select('*')
        .eq('condominium_id', selectedCondominium);

      if (error) throw error;
      
      console.log('Relaciones empleado-consorcio encontradas:', data?.length || 0, data);
      setEmployeeCondominiums(data || []);
    } catch (err) {
      console.error('Error al cargar relaciones empleado-consorcio:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar relaciones empleado-consorcio');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeePayments = async () => {
    if (!selectedCondominium) return;
    
    try {
      setLoading(true);
      
      // Primero obtenemos los IDs de empleados asociados a este consorcio
      console.log('Obteniendo empleados asociados al consorcio:', selectedCondominium);
      const { data: employeeCondominiums, error: employeeCondominiumsError } = await supabase
        .from('employee_condominiums')
        .select('employee_id')
        .eq('condominium_id', selectedCondominium);
      
      if (employeeCondominiumsError) {
        console.error('Error al obtener relaciones empleado-consorcio:', employeeCondominiumsError);
        throw employeeCondominiumsError;
      }
      
      const employeeIds = employeeCondominiums?.map(ec => ec.employee_id) || [];
      console.log('IDs de empleados encontrados para este consorcio:', employeeIds);
      
      if (employeeIds.length === 0) {
        console.log('No se encontraron empleados asociados a este consorcio');
        setEmployeePayments([]);
        return;
      }
      
      // Ahora obtenemos los pagos de esos empleados
      console.log('Buscando pagos para los empleados:', employeeIds);
      const { data: payments, error: paymentsError } = await supabase
        .from('employee_payments')
        .select('*, employee:employees(name, position)')
        .in('employee_id', employeeIds)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false });
      
      if (paymentsError) {
        console.error('Error al obtener pagos de empleados:', paymentsError);
        throw paymentsError;
      }
      
      console.log('Pagos de empleados encontrados:', payments?.length || 0, payments);
      setEmployeePayments(payments || []);
    } catch (err) {
      console.error('Error al cargar pagos de empleados:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar pagos de empleados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Depuración de Pagos de Empleados</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Consorcio:
        </label>
        <select
          className="w-full p-2 border rounded"
          value={selectedCondominium || ''}
          onChange={(e) => setSelectedCondominium(e.target.value)}
          disabled={loading}
        >
          <option value="">Seleccione un consorcio</option>
          {condominiums.map((condo) => (
            <option key={condo.id} value={condo.id}>
              {condo.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Relaciones Empleado-Consorcio</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : employeeCondominiums.length > 0 ? (
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border">ID</th>
                <th className="py-2 px-4 border">ID Empleado</th>
                <th className="py-2 px-4 border">ID Consorcio</th>
              </tr>
            </thead>
            <tbody>
              {employeeCondominiums.map((relation) => (
                <tr key={relation.id}>
                  <td className="py-2 px-4 border">{relation.id}</td>
                  <td className="py-2 px-4 border">{relation.employee_id}</td>
                  <td className="py-2 px-4 border">{relation.condominium_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No se encontraron relaciones empleado-consorcio.</p>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Pagos de Empleados</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : employeePayments.length > 0 ? (
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border">Empleado</th>
                <th className="py-2 px-4 border">Posición</th>
                <th className="py-2 px-4 border">Fecha de Pago</th>
                <th className="py-2 px-4 border">Monto Total</th>
              </tr>
            </thead>
            <tbody>
              {employeePayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-2 px-4 border">{payment.employee?.name || 'N/A'}</td>
                  <td className="py-2 px-4 border">{payment.employee?.position || 'N/A'}</td>
                  <td className="py-2 px-4 border">{new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border">${payment.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No se encontraron pagos de empleados.</p>
        )}
      </div>
    </div>
  );
}
