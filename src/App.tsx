import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Condominiums from './pages/condominiums/Condominiums';
import CreateCondominium from './pages/condominiums/CreateCondominium';
import CondominiumDetails from './pages/condominiums/CondominiumDetails';
import CondominiumBalances from './pages/condominiums/CondominiumBalances';
import Expenses from './pages/expenses/Expenses';
import ExpenseDetails from './pages/expenses/ExpenseDetails';
import Employees from './pages/employees/Employees';
import CreateEmployee from './pages/employees/CreateEmployee';
import EmployeeDetails from './pages/employees/EmployeeDetails';
import EmployeePayments from './pages/employees/EmployeePayments';
import CreateEmployeePayment from './pages/employees/CreateEmployeePayment';
import EmployeeCompensationHistory from './pages/employees/EmployeeCompensationHistory';
import EmployeeCompensationsOverview from './pages/employees/EmployeeCompensationsOverview';
import Providers from './pages/providers/Providers';
import ProviderInvoices from './pages/providers/ProviderInvoices';
import CreateProviderInvoice from './pages/providers/CreateProviderInvoice';
import ProviderInvoiceDetails from './pages/providers/ProviderInvoiceDetails';
import ProviderInvoicesOverview from './pages/providers/ProviderInvoicesOverview';
import Fees from './pages/fees/Fees';
import FeeDetails from './pages/fees/FeeDetails';
import Payments from './pages/payments/Payments';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import UnitTextImporter from './pages/condominiums/UnitTextImporter';

// Types
import { User } from './types/auth';

// Context
import { AuthProvider } from './context/AuthContext';

// Supabase client
import { supabase } from './lib/supabaseClient';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ? { id: session.user.id } : null);
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ? { id: session.user.id } : null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <AuthProvider value={{ user, supabase }}>
      <>
        <Toaster position="top-right" />
        <Routes>
          {/* Public routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/consorcios" element={<Condominiums />} />
              <Route path="/consorcios/new" element={<CreateCondominium />} />
              <Route path="/consorcios/:id" element={<CondominiumDetails />} />
              <Route path="/consorcios/:id/units/import-text" element={<UnitTextImporter />} />
              <Route path="/consorcios-balances" element={<CondominiumBalances />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/expenses/:id" element={<ExpenseDetails />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/new" element={<CreateEmployee />} />
              <Route path="/employees/:id" element={<EmployeeDetails />} />
              <Route path="/employees/:id/compensations" element={<EmployeeCompensationHistory />} />
              <Route path="/employees/:id/payments" element={<EmployeePayments />} />
              <Route path="/employees/:id/payments/new" element={<CreateEmployeePayment />} />
              <Route path="/employee-compensations" element={<EmployeeCompensationsOverview />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/providers/:id/invoices" element={<ProviderInvoices />} />
              <Route path="/providers/:id/invoices/new" element={<CreateProviderInvoice />} />
              <Route path="/providers/:providerId/invoices/:invoiceId" element={<ProviderInvoiceDetails />} />
              <Route path="/provider-invoices" element={<ProviderInvoicesOverview />} />
              <Route path="/fees" element={<Fees />} />
              <Route path="/fees/:id" element={<FeeDetails />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </AuthProvider>
  );
}

export default App;