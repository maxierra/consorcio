import React from 'react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

// Registrar los componentes de Chart.js
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface BalanceChartsProps {
  totalIncome: number;
  totalSalaries: number;
  totalInvoices: number;
  initialBalance: number;
  finalBalance: number;
}

const BalanceCharts: React.FC<BalanceChartsProps> = ({
  totalIncome,
  totalSalaries,
  totalInvoices,
  initialBalance,
  finalBalance
}) => {
  // Datos para el gráfico circular de distribución de egresos
  const expensesDistributionData = {
    labels: ['Sueldos', 'Facturas'],
    datasets: [
      {
        label: 'Distribución de Egresos',
        data: [totalSalaries, totalInvoices],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Datos para el gráfico de barras de ingresos vs egresos
  const incomeVsExpensesData = {
    labels: ['Ingresos vs Egresos'],
    datasets: [
      {
        label: 'Ingresos',
        data: [totalIncome],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Egresos',
        data: [totalSalaries + totalInvoices],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para el gráfico de barras del balance
  const balanceData = {
    labels: ['Saldo Inicial', 'Ingresos', 'Egresos', 'Saldo Final'],
    datasets: [
      {
        label: 'Balance',
        data: [
          initialBalance, 
          totalIncome, 
          totalSalaries + totalInvoices, 
          finalBalance
        ],
        backgroundColor: [
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Opciones para el gráfico de barras
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Formatear números como moneda argentina
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(value);
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Gráficos de Balance</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Gráfico de distribución de egresos */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Pie data={expensesDistributionData} />
            </div>
            <div className="mt-4 text-center">
              <p>Sueldos: {formatCurrency(totalSalaries)}</p>
              <p>Facturas: {formatCurrency(totalInvoices)}</p>
              <p className="font-bold">Total: {formatCurrency(totalSalaries + totalInvoices)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de ingresos vs egresos */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={incomeVsExpensesData} options={barOptions} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-green-600">Ingresos: {formatCurrency(totalIncome)}</p>
              <p className="text-red-600">Egresos: {formatCurrency(totalSalaries + totalInvoices)}</p>
              <p className="font-bold">Diferencia: {formatCurrency(totalIncome - (totalSalaries + totalInvoices))}</p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de balance general */}
        <Card>
          <CardHeader>
            <CardTitle>Balance General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={balanceData} options={barOptions} />
            </div>
            <div className="mt-4 text-center">
              <p>Saldo Inicial: {formatCurrency(initialBalance)}</p>
              <p className="text-green-600">+ Ingresos: {formatCurrency(totalIncome)}</p>
              <p className="text-red-600">- Egresos: {formatCurrency(totalSalaries + totalInvoices)}</p>
              <p className="font-bold">= Saldo Final: {formatCurrency(finalBalance)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BalanceCharts;
