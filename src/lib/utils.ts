import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  // Formato de moneda argentina: $ con separador de miles (.) y coma decimal
  // Limitar a 2 decimales para evitar números muy largos
  const fixedAmount = parseFloat(amount.toFixed(2));
  
  const formattedNumber = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(fixedAmount);
  
  // Reemplazar el símbolo ARS por $ y asegurar el formato correcto
  return formattedNumber
    .replace('ARS', '$')
    .replace('$', '$ ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    maintenance: 'bg-blue-100 text-blue-800',
    cleaning: 'bg-green-100 text-green-800',
    utilities: 'bg-purple-100 text-purple-800',
    administration: 'bg-yellow-100 text-yellow-800',
    repairs: 'bg-red-100 text-red-800',
    insurance: 'bg-indigo-100 text-indigo-800',
    taxes: 'bg-pink-100 text-pink-800',
    other: 'bg-gray-100 text-gray-800',
  };
  
  return colors[category] || colors.other;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: 'bg-success-100 text-success-700',
    pending: 'bg-warning-100 text-warning-700',
    overdue: 'bg-danger-100 text-danger-700',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}