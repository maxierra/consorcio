import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { 
  Building, 
  Home, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { CondominiumSummary } from '../types/condominium';
import { ExpenseSummary, ExpensesByCategory } from '../types/expense';
import { FeeSummary } from '../types/fee';

export default function Dashboard() {
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [condominiums, setCondominiums] = useState<CondominiumSummary[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseSummary[]>([]);
  const [feesStatus, setFeesStatus] = useState<FeeSummary[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [totalCondominiums, setTotalCondominiums] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        // This would be an actual Supabase query in a real application
        // For demo, we're using mock data
        
        // Mock data
        setCondominiums([
          {
            id: '1',
            name: 'Riverside Towers',
            address: '123 River Blvd, New York, NY',
            units_count: 24,
            pending_amount: 5600,
          },
          {
            id: '2',
            name: 'Marina Heights',
            address: '456 Harbor Way, Miami, FL',
            units_count: 18,
            pending_amount: 3200,
          },
          {
            id: '3',
            name: 'Mountain View Residences',
            address: '789 Alpine Road, Denver, CO',
            units_count: 12,
            pending_amount: 1800,
          },
        ]);
        
        setRecentExpenses([
          {
            id: '1',
            description: 'Monthly cleaning service',
            amount: 1200,
            date: '2025-04-10',
            category: 'cleaning',
            condominium_name: 'Riverside Towers',
          },
          {
            id: '2',
            description: 'Elevator maintenance',
            amount: 850,
            date: '2025-04-08',
            category: 'maintenance',
            condominium_name: 'Marina Heights',
          },
          {
            id: '3',
            description: 'Water bill payment',
            amount: 620,
            date: '2025-04-05',
            category: 'utilities',
            condominium_name: 'Mountain View Residences',
          },
          {
            id: '4',
            description: 'Lobby furniture repair',
            amount: 350,
            date: '2025-04-03',
            category: 'repairs',
            condominium_name: 'Riverside Towers',
          },
        ]);
        
        setFeesStatus([
          {
            id: '1',
            period: 'April 2025',
            condominium_name: 'Riverside Towers',
            total_amount: 12400,
            paid_percentage: 68,
          },
          {
            id: '2',
            period: 'April 2025',
            condominium_name: 'Marina Heights',
            total_amount: 9600,
            paid_percentage: 85,
          },
          {
            id: '3',
            period: 'April 2025',
            condominium_name: 'Mountain View Residences',
            total_amount: 5800,
            paid_percentage: 42,
          },
        ]);
        
        setExpensesByCategory([
          { category: 'maintenance', amount: 3200 },
          { category: 'cleaning', amount: 2400 },
          { category: 'utilities', amount: 1800 },
          { category: 'administration', amount: 1200 },
          { category: 'repairs', amount: 900 },
        ]);
        
        setTotalUnits(54);
        setTotalCondominiums(3);
        setPendingAmount(10600);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [supabase, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Panel Principal</h1>
        <div className="flex space-x-3">
          <Link to="/condominiums/new">
            <Button variant="primary" className="flex items-center">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Condominio
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="bg-primary-100 p-3 rounded-full">
                <Building className="h-6 w-6 text-primary-700" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Condominios</p>
                <p className="text-2xl font-semibold text-gray-900">{totalCondominiums}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="bg-secondary-100 p-3 rounded-full">
                <Home className="h-6 w-6 text-secondary-700" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Unidades</p>
                <p className="text-2xl font-semibold text-gray-900">{totalUnits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="bg-warning-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-warning-700" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Monto Pendiente</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center">
              <div className="bg-success-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-success-700" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Tasa de Cobro</p>
                <p className="text-2xl font-semibold text-gray-900">73%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Condominiums */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Condominios Activos</CardTitle>
              <CardDescription>Mostrando {condominiums.length} propiedades</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {condominiums.map((condominium) => (
                <div 
                  key={condominium.id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="bg-primary-100 h-10 w-10 rounded-full flex items-center justify-center text-primary-700 font-medium">
                      {condominium.name.substring(0, 2)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{condominium.name}</p>
                      <p className="text-xs text-gray-500">{condominium.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-4 text-right">
                      <p className="text-sm text-gray-500">{condominium.units_count} unidades</p>
                      <p className="text-sm font-medium text-danger-600">
                        {formatCurrency(condominium.pending_amount)} pendiente
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-500">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Gastos Recientes</CardTitle>
              <CardDescription>Gastos de los últimos 30 días</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              Agregar gasto
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExpenses.map((expense) => (
                <div 
                  key={expense.id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm ${
                      expense.category === 'cleaning' ? 'bg-green-100 text-green-700' :
                      expense.category === 'maintenance' ? 'bg-blue-100 text-blue-700' :
                      expense.category === 'utilities' ? 'bg-purple-100 text-purple-700' :
                      expense.category === 'repairs' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {expense.category.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                      <p className="text-xs text-gray-500">{expense.condominium_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</p>
                    <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Fees Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cobro de Cuotas</CardTitle>
          <CardDescription>Progreso de cobro del mes actual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condominio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progreso de Cobro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feesStatus.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fee.condominium_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fee.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(fee.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            fee.paid_percentage > 80 ? 'bg-success-500' :
                            fee.paid_percentage > 50 ? 'bg-warning-500' :
                            'bg-danger-500'
                          }`}
                          style={{ width: `${fee.paid_percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{fee.paid_percentage}% cobrado</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={
                          fee.paid_percentage > 80 ? 'success' :
                          fee.paid_percentage > 50 ? 'warning' :
                          'danger'
                        }
                      >
                        {fee.paid_percentage > 80 ? 'Bueno' :
                         fee.paid_percentage > 50 ? 'Regular' :
                         'En Riesgo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Alerts */}
      <Card className="border-warning-200 bg-warning-50">
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
            <CardTitle className="text-warning-700">Alertas de Pago</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-warning-500" />
              <p className="ml-2 text-sm text-warning-700">
                <span className="font-semibold">Mountain View Residences</span>: Tasa de cobro por debajo del 50% para Abril 2025
              </p>
            </li>
            <li className="flex items-start">
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-warning-500" />
              <p className="ml-2 text-sm text-warning-700">
                <span className="font-semibold">Riverside Towers</span>: 5 unidades con saldos pendientes por más de 60 días
              </p>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline" className="border-warning-200 text-warning-700 hover:bg-warning-100">
            Ver todas las alertas
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}