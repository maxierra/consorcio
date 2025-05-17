import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Reports() {
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expensesByMonth, setExpensesByMonth] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [collectionRate, setCollectionRate] = useState([]);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // Mock data for demonstration
        setExpensesByMonth([
          { month: 'Jan', amount: 12500 },
          { month: 'Feb', amount: 15000 },
          { month: 'Mar', amount: 13200 },
          { month: 'Apr', amount: 14800 },
          { month: 'May', amount: 11900 },
          { month: 'Jun', amount: 13500 },
        ]);

        setExpensesByCategory([
          { name: 'Maintenance', value: 35000 },
          { name: 'Utilities', value: 25000 },
          { name: 'Cleaning', value: 15000 },
          { name: 'Insurance', value: 12000 },
          { name: 'Administration', value: 8000 },
          { name: 'Others', value: 5000 },
        ]);

        setCollectionRate([
          { month: 'Jan', rate: 95 },
          { month: 'Feb', rate: 92 },
          { month: 'Mar', rate: 88 },
          { month: 'Apr', rate: 94 },
          { month: 'May', rate: 91 },
          { month: 'Jun', rate: 89 },
        ]);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
        <div className="flex space-x-3">
          <Badge variant="info">Last Updated: {new Date().toLocaleDateString()}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses</CardTitle>
            <CardDescription>Expense trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    labelStyle={{ color: '#111827' }}
                  />
                  <Legend />
                  <Bar dataKey="amount" fill="#2563EB" name="Total Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Distribution of expenses across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => entry.name}
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Rate</CardTitle>
          <CardDescription>Monthly fee collection performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Bar
                  dataKey="rate"
                  fill="#0D9488"
                  name="Collection Rate"
                  label={{ position: 'top', formatter: (value) => `${value}%` }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}