import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { formatCurrency } from '../lib/utils';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpenseSummaryCardProps {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  totalCount: number;
}

const ExpenseSummaryCard: React.FC<ExpenseSummaryCardProps> = ({
  totalAmount,
  paidAmount,
  pendingAmount,
  paidCount,
  totalCount,
}) => {
  // Datos para el gráfico de torta
  const chartData = {
    labels: ['Pagado', 'Pendiente'],
    datasets: [
      {
        data: [paidAmount, pendingAmount],
        backgroundColor: ['#10B981', '#F59E0B'],
        borderColor: ['#059669', '#D97706'],
        borderWidth: 1,
      },
    ],
  };

  // Opciones para el gráfico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = Math.round((value / totalAmount) * 100);
            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    },
  };

  // Calcular porcentajes
  const paidPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const pendingPercentage = 100 - paidPercentage;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <h2 className="text-lg font-semibold text-blue-800">Resumen Financiero del Período</h2>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Columna de información */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-700 mb-3">Montos</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total a cobrar:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pagado:</span>
                  <span className="font-bold text-green-600">{formatCurrency(paidAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pendiente:</span>
                  <span className="font-bold text-yellow-600">{formatCurrency(pendingAmount)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-700 mb-3">Unidades</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total de unidades:</span>
                  <span className="font-bold text-gray-900">{totalCount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unidades pagadas:</span>
                  <span className="font-bold text-green-600">{paidCount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unidades pendientes:</span>
                  <span className="font-bold text-yellow-600">{totalCount - paidCount}</span>
                </div>
              </div>
            </div>
            
            {/* Barra de progreso */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-600 font-medium">{paidPercentage}% Pagado</span>
                <span className="text-yellow-600 font-medium">{pendingPercentage}% Pendiente</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full" 
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Columna del gráfico */}
          <div className="h-64 flex items-center justify-center">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseSummaryCard;
