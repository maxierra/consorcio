import { useState, useEffect, ReactNode } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import BalanceCharts from '../../components/BalanceCharts';

// Componente para secciones expandibles/contraíbles
interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  bgColor: string;
  textColor: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children, 
  isExpanded, 
  onToggle, 
  bgColor, 
  textColor 
}) => {
  return (
    <div className="mb-8">
      <div 
        className={`flex justify-between items-center mb-2 p-2 ${bgColor} rounded cursor-pointer`}
        onClick={onToggle}
      >
        <h3 className={`text-lg font-semibold ${textColor}`}>{title}</h3>
        <span className={textColor}>
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </span>
      </div>
      {isExpanded && (
        <div className="overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
};

// Interfaces
interface Condominium {
  id: string;
  name: string;
  address: string;
  tax_id?: string;
}

interface CondominiumBalance {
  id: string;
  condominium_id: string;
  period_month: number;
  period_year: number;
  initial_balance: number;
  income: number;
  expenses: number;
  final_balance: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ExpensePayment {
  id: string;
  condominium_id: string;
  unit_id: string;
  month: number;
  year: number;
  amount: number;
  payment_date: string;
  payment_status: 'paid' | 'unpaid' | 'partial';
  unit?: {
    number: string;
    owner_name: string;
  }
}

interface ProviderInvoice {
  id: string;
  provider_id: string;
  condominium_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  description: string;
  status: string;
  month: number;
  year: number;
  category: string;
  provider?: {
    name: string;
  }
}

interface EmployeePayment {
  id: string;
  employee_id: string;
  condominium_id: string;
  total_amount: number;
  status: string;
  employee?: {
    name: string;
    position: string;
  }
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
  payment_status: string;
  payment_date: string;
  employee?: {
    name: string;
    position: string;
  }
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CondominiumBalances = () => {
  // Estados
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondominium, setSelectedCondominium] = useState<string | null>(null);
  const [balances, setBalances] = useState<CondominiumBalance[]>([]);
  const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);
  const [filteredExpensePayments, setFilteredExpensePayments] = useState<ExpensePayment[]>([]);
  const [providerInvoices, setProviderInvoices] = useState<ProviderInvoice[]>([]);
  const [filteredProviderInvoices, setFilteredProviderInvoices] = useState<ProviderInvoice[]>([]);
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>([]);
  const [employeeCompensations, setEmployeeCompensations] = useState<EmployeeCompensation[]>([]);
  const [filteredEmployeeCompensations, setFilteredEmployeeCompensations] = useState<EmployeeCompensation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalSalaries, setTotalSalaries] = useState<number>(0);
  const [totalInvoices, setTotalInvoices] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [showPaymentsHistory, setShowPaymentsHistory] = useState<boolean>(false);
  const [showInvoicesHistory, setShowInvoicesHistory] = useState<boolean>(false);
  const [showCompensationsHistory, setShowCompensationsHistory] = useState<boolean>(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState<{
    payments: boolean;
    invoices: boolean;
    compensations: boolean;
  }>({ payments: false, invoices: false, compensations: false });

  // Cargar condominios al iniciar
  useEffect(() => {
    const fetchCondominiums = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('condominiums')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        setCondominiums(data || []);
        
        // Si hay condominios, seleccionar el primero por defecto
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

    fetchCondominiums();
  }, []);

  // Cargar balances cuando se selecciona un condominio
  useEffect(() => {
    if (selectedCondominium) {
      fetchBalances();
    }
  }, [selectedCondominium]);

  // Función para obtener los balances del condominio seleccionado
  const fetchBalances = async () => {
    if (!selectedCondominium) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('condominium_balances')
        .select('*')
        .eq('condominium_id', selectedCondominium)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      
      if (error) throw error;
      
      setBalances(data || []);
      
      // Cargar datos financieros para los gráficos
      if (data && data.length > 0) {
        await Promise.all([
          fetchExpensePaymentsData(),
          fetchProviderInvoicesData(),
          fetchEmployeeCompensationsData()
        ]);
      }
    } catch (err) {
      console.error('Error al cargar balances:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar balances');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener los pagos de expensas
  const fetchExpensePaymentsData = async () => {
    if (!selectedCondominium) return;
    
    try {
      const { data, error } = await supabase
        .from('expense_payments')
        .select(`
          *,
          unit:units(number, owner_name)
        `)
        .eq('condominium_id', selectedCondominium)
        .eq('payment_status', 'paid');
      
      if (error) throw error;
      
      setExpensePayments(data || []);
      
      // Extraer años únicos para el selector
      if (data && data.length > 0) {
        const years = [...new Set(data.map(payment => payment.year))].sort((a, b) => b - a);
        setAvailableYears(years);
        
        // Establecer el año y mes más reciente como seleccionado por defecto
        const latestPayment = data.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })[0];
        
        if (latestPayment) {
          setSelectedYear(latestPayment.year);
          setSelectedMonth(latestPayment.month);
        }
      }
      
      // Filtrar pagos por período seleccionado
      filterPaymentsByPeriod(data || []);
      
      // Calcular total de ingresos
      const total = data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      setTotalIncome(total);
    } catch (err) {
      console.error('Error al cargar pagos de expensas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar pagos de expensas');
    }
  };
  
  // Filtrar pagos por período seleccionado
  const filterPaymentsByPeriod = (payments: ExpensePayment[]) => {
    const filtered = payments.filter(payment => 
      payment.year === selectedYear && payment.month === selectedMonth
    );
    setFilteredExpensePayments(filtered);
    setShowPaymentsHistory(filtered.length > 0);
  };
  
  // Actualizar filtros cuando cambia el período seleccionado
  useEffect(() => {
    if (expensePayments.length > 0) {
      filterPaymentsByPeriod(expensePayments);
    }
  }, [selectedYear, selectedMonth, expensePayments]);

  // Función para obtener las facturas de proveedores
  const fetchProviderInvoicesData = async () => {
    if (!selectedCondominium) return;
    
    try {
      const { data, error } = await supabase
        .from('provider_invoices')
        .select(`
          *,
          provider:providers(name)
        `)
        .eq('condominium_id', selectedCondominium)
        .eq('status', 'paid');
      
      if (error) throw error;
      
      setProviderInvoices(data || []);
      
      // Si no tenemos años disponibles todavía (pueden venir de los pagos de expensas)
      // extraemos los años únicos de las facturas
      if (availableYears.length === 0 && data && data.length > 0) {
        const years = [...new Set(data.map(invoice => invoice.year))].sort((a, b) => b - a);
        setAvailableYears(years);
        
        // Establecer el año y mes más reciente como seleccionado por defecto
        const latestInvoice = data.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })[0];
        
        if (latestInvoice) {
          setSelectedYear(latestInvoice.year);
          setSelectedMonth(latestInvoice.month);
        }
      }
      
      // Filtrar facturas por período seleccionado
      filterInvoicesByPeriod(data || []);
      
      // Calcular total de facturas
      const total = data?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0;
      setTotalInvoices(total);
    } catch (err) {
      console.error('Error al cargar facturas de proveedores:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar facturas de proveedores');
    }
  };
  
  // Filtrar facturas por período seleccionado
  const filterInvoicesByPeriod = (invoices: ProviderInvoice[]) => {
    const filtered = invoices.filter(invoice => 
      invoice.year === selectedYear && invoice.month === selectedMonth
    );
    setFilteredProviderInvoices(filtered);
    setShowInvoicesHistory(filtered.length > 0);
  };
  
  // Actualizar filtros de facturas cuando cambia el período seleccionado
  useEffect(() => {
    if (providerInvoices.length > 0) {
      filterInvoicesByPeriod(providerInvoices);
    }
  }, [selectedYear, selectedMonth, providerInvoices]);

  // Función para obtener las compensaciones de empleados
  const fetchEmployeeCompensationsData = async () => {
    if (!selectedCondominium) return;
    
    try {
      // Primero obtenemos los IDs de empleados asociados a este consorcio
      const { data: employeeIds, error: employeeError } = await supabase
        .from('employee_condominiums')
        .select('employee_id')
        .eq('condominium_id', selectedCondominium);
      
      if (employeeError) throw employeeError;
      
      if (!employeeIds || employeeIds.length === 0) {
        setEmployeeCompensations([]);
        setFilteredEmployeeCompensations([]);
        setTotalSalaries(0);
        setShowCompensationsHistory(false);
        return;
      }
      
      // Luego obtenemos las compensaciones de esos empleados
      const { data, error } = await supabase
        .from('employee_compensations')
        .select(`
          *,
          employee:employees(name, position)
        `)
        .in('employee_id', employeeIds.map(e => e.employee_id));
      
      if (error) throw error;
      
      setEmployeeCompensations(data || []);
      
      // Si no tenemos años disponibles todavía, extraemos los años únicos
      if (availableYears.length === 0 && data && data.length > 0) {
        const years = [...new Set(data.map(comp => comp.year))].sort((a, b) => b - a);
        setAvailableYears(years);
        
        // Establecer el año y mes más reciente como seleccionado por defecto
        const latestComp = data.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        })[0];
        
        if (latestComp) {
          setSelectedYear(latestComp.year);
          setSelectedMonth(latestComp.month);
        }
      }
      
      // Filtrar compensaciones por período seleccionado
      filterCompensationsByPeriod(data || []);
      
      // Calcular total de salarios (solo de las compensaciones pagadas)
      const paidCompensations = data?.filter(comp => comp.payment_status === 'paid') || [];
      const total = paidCompensations.reduce((sum, comp) => sum + comp.total_compensation, 0) || 0;
      setTotalSalaries(total);
    } catch (err) {
      console.error('Error al cargar compensaciones de empleados:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar compensaciones de empleados');
    }
  };
  
  // Filtrar compensaciones por período seleccionado
  const filterCompensationsByPeriod = (compensations: EmployeeCompensation[]) => {
    const filtered = compensations.filter(comp => 
      comp.year === selectedYear && comp.month === selectedMonth
    );
    setFilteredEmployeeCompensations(filtered);
    setShowCompensationsHistory(filtered.length > 0);
  };
  
  // Actualizar filtros de compensaciones cuando cambia el período seleccionado
  useEffect(() => {
    if (employeeCompensations.length > 0) {
      filterCompensationsByPeriod(employeeCompensations);
    }
  }, [selectedYear, selectedMonth, employeeCompensations]);

  // Formatear números como moneda argentina
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" className="mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Balance del Consorcio</h1>
      </div>

      {/* Selector de consorcio */}
      <div className="mb-6">
        <label htmlFor="condominium-select" className="block text-sm font-medium mb-2">
          Seleccionar Consorcio
        </label>
        <select
          id="condominium-select"
          className="w-full p-2 border rounded"
          value={selectedCondominium || ''}
          onChange={(e) => setSelectedCondominium(e.target.value)}
        >
          <option value="">Seleccione un consorcio</option>
          {condominiums.map((condominium) => (
            <option key={condominium.id} value={condominium.id}>
              {condominium.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mostrar mensaje de error si existe */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Tabla de balances */}
      {balances.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Balances Mensuales</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border">Período</th>
                  <th className="py-2 px-4 border">Saldo Inicial</th>
                  <th className="py-2 px-4 border">Ingresos</th>
                  <th className="py-2 px-4 border">Egresos</th>
                  <th className="py-2 px-4 border">Saldo Final</th>
                  <th className="py-2 px-4 border">Estado</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => (
                  <tr key={balance.id}>
                    <td className="py-2 px-4 border">
                      {MONTHS[balance.period_month - 1]} {balance.period_year}
                    </td>
                    <td className="py-2 px-4 border">{formatCurrency(balance.initial_balance)}</td>
                    <td className="py-2 px-4 border">{formatCurrency(balance.income)}</td>
                    <td className="py-2 px-4 border">{formatCurrency(balance.expenses)}</td>
                    <td className="py-2 px-4 border">{formatCurrency(balance.final_balance)}</td>
                    <td className="py-2 px-4 border">
                      <span className={`px-2 py-1 rounded ${
                        balance.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {balance.status === 'open' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selectores de período para filtrar pagos y facturas */}
      {(expensePayments.length > 0 || providerInvoices.length > 0) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Movimientos por Período</h2>
          <div className="flex gap-4 mb-4">
            <div className="w-1/2">
              <label htmlFor="year-select" className="block text-sm font-medium mb-2">
                Año
              </label>
              <select
                id="year-select"
                className="w-full p-2 border rounded"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-1/2">
              <label htmlFor="month-select" className="block text-sm font-medium mb-2">
                Mes
              </label>
              <select
                id="month-select"
                className="w-full p-2 border rounded"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Tabla de pagos de expensas (INGRESOS) */}
          {showPaymentsHistory && (
            <CollapsibleSection
              title="Ingresos: Pagos de Expensas"
              isExpanded={expandedSections.payments}
              onToggle={() => setExpandedSections(prev => ({ ...prev, payments: !prev.payments }))}
              bgColor="bg-green-100"
              textColor="text-green-600"
            >
              <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border">Unidad</th>
                    <th className="py-2 px-4 border">Propietario</th>
                    <th className="py-2 px-4 border">Fecha de Pago</th>
                    <th className="py-2 px-4 border">Monto</th>
                    <th className="py-2 px-4 border">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpensePayments.map((payment) => (
                    <tr key={payment.id} className={
                      payment.payment_status === 'paid' ? 'bg-green-50' : 
                      payment.payment_status === 'partial' ? 'bg-yellow-50' : 'bg-red-50'
                    }>
                      <td className="py-2 px-4 border">{payment.unit?.number}</td>
                      <td className="py-2 px-4 border">{payment.unit?.owner_name}</td>
                      <td className="py-2 px-4 border">
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('es-AR') : '-'}
                      </td>
                      <td className="py-2 px-4 border">{formatCurrency(payment.amount)}</td>
                      <td className="py-2 px-4 border">
                        <span className={
                          `px-2 py-1 rounded ${
                            payment.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                            payment.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`
                        }>
                          {payment.payment_status === 'paid' ? 'Pagado' : 
                           payment.payment_status === 'partial' ? 'Parcial' : 'No Pagado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredExpensePayments.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No hay pagos registrados para este período.
                </div>
              )}
              
              {filteredExpensePayments.length > 0 && (
                <div className="mt-2 text-right font-bold text-green-600">
                  Total Ingresos: {formatCurrency(filteredExpensePayments.reduce((sum, payment) => sum + payment.amount, 0))}
                </div>
              )}
            </CollapsibleSection>
          )}
          
          {/* Tabla de facturas de proveedores (EGRESOS) */}
          {showInvoicesHistory && (
            <CollapsibleSection
              title="Egresos: Facturas de Proveedores"
              isExpanded={expandedSections.invoices}
              onToggle={() => setExpandedSections(prev => ({ ...prev, invoices: !prev.invoices }))}
              bgColor="bg-red-100"
              textColor="text-red-600"
            >
              <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border">Proveedor</th>
                    <th className="py-2 px-4 border">Número de Factura</th>
                    <th className="py-2 px-4 border">Fecha</th>
                    <th className="py-2 px-4 border">Categoría</th>
                    <th className="py-2 px-4 border">Descripción</th>
                    <th className="py-2 px-4 border">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProviderInvoices.map((invoice) => (
                    <tr key={invoice.id} className="bg-red-50">
                      <td className="py-2 px-4 border">{invoice.provider?.name}</td>
                      <td className="py-2 px-4 border">{invoice.invoice_number}</td>
                      <td className="py-2 px-4 border">
                        {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('es-AR') : '-'}
                      </td>
                      <td className="py-2 px-4 border">{invoice.category}</td>
                      <td className="py-2 px-4 border">{invoice.description}</td>
                      <td className="py-2 px-4 border">{formatCurrency(invoice.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredProviderInvoices.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No hay facturas registradas para este período.
                </div>
              )}
              
              {filteredProviderInvoices.length > 0 && (
                <div className="mt-2 text-right font-bold text-red-600">
                  Total Egresos: {formatCurrency(filteredProviderInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
                </div>
              )}
            </CollapsibleSection>
          )}
          
          {/* Tabla de compensaciones de empleados (EGRESOS) */}
          {showCompensationsHistory && (
            <CollapsibleSection
              title="Egresos: Compensaciones de Empleados"
              isExpanded={expandedSections.compensations}
              onToggle={() => setExpandedSections(prev => ({ ...prev, compensations: !prev.compensations }))}
              bgColor="bg-red-100"
              textColor="text-red-600"
            >
              <table className="min-w-full bg-white border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border">Empleado</th>
                    <th className="py-2 px-4 border">Cargo</th>
                    <th className="py-2 px-4 border">Salario Neto</th>
                    <th className="py-2 px-4 border">Seguridad Social</th>
                    <th className="py-2 px-4 border">Aporte Sindical</th>
                    <th className="py-2 px-4 border">Otras Deducciones</th>
                    <th className="py-2 px-4 border">Compensación Total</th>
                    <th className="py-2 px-4 border">Estado</th>
                    <th className="py-2 px-4 border">Fecha de Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeeCompensations.map((comp) => (
                    <tr key={comp.id} className="bg-red-50">
                      <td className="py-2 px-4 border">{comp.employee?.name}</td>
                      <td className="py-2 px-4 border">{comp.employee?.position}</td>
                      <td className="py-2 px-4 border">{formatCurrency(comp.net_salary)}</td>
                      <td className="py-2 px-4 border">{formatCurrency(comp.social_security)}</td>
                      <td className="py-2 px-4 border">{formatCurrency(comp.union_contribution)}</td>
                      <td className="py-2 px-4 border">{formatCurrency(comp.other_deductions)}</td>
                      <td className="py-2 px-4 border font-bold">{formatCurrency(comp.total_compensation)}</td>
                      <td className="py-2 px-4 border">
                        <span className={
                          `px-2 py-1 rounded ${
                            comp.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`
                        }>
                          {comp.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-2 px-4 border">
                        {comp.payment_date ? new Date(comp.payment_date).toLocaleDateString('es-AR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredEmployeeCompensations.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No hay compensaciones registradas para este período.
                </div>
              )}
              
              {filteredEmployeeCompensations.length > 0 && (
                <div className="mt-2 text-right font-bold text-red-600">
                  Total Compensaciones: {formatCurrency(filteredEmployeeCompensations.reduce((sum, comp) => sum + comp.total_compensation, 0))}
                </div>
              )}
            </CollapsibleSection>
          )}
          
          {/* Resumen del período */}
          {(showPaymentsHistory || showInvoicesHistory || showCompensationsHistory) && (
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Resumen del Período: {MONTHS[selectedMonth - 1]} {selectedYear}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800">Total Ingresos</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(filteredExpensePayments.reduce((sum, payment) => sum + payment.amount, 0))}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <p className="text-sm text-red-800">Total Egresos</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(
                      filteredProviderInvoices.reduce((sum, invoice) => sum + invoice.amount, 0) +
                      filteredEmployeeCompensations.filter(comp => comp.payment_status === 'paid')
                        .reduce((sum, comp) => sum + comp.total_compensation, 0)
                    )}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">Balance del Período</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(
                      filteredExpensePayments.reduce((sum, payment) => sum + payment.amount, 0) - 
                      (filteredProviderInvoices.reduce((sum, invoice) => sum + invoice.amount, 0) +
                       filteredEmployeeCompensations.filter(comp => comp.payment_status === 'paid')
                         .reduce((sum, comp) => sum + comp.total_compensation, 0))
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Gráficos de balance */}
      {balances.length > 0 && (
        <BalanceCharts
          totalIncome={totalIncome}
          totalSalaries={totalSalaries}
          totalInvoices={totalInvoices}
          initialBalance={balances[0].initial_balance}
          finalBalance={balances[0].final_balance}
        />
      )}
    </div>
  );
};

export default CondominiumBalances;