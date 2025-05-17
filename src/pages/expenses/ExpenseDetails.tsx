import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  receipt_url?: string;
  is_extraordinary: boolean;
  condominium_id: string;
  created_at: string;
}

export default function ExpenseDetails() {
  const { id } = useParams();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExpense() {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setExpense(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchExpense();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Expense not found
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Expense Details</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-lg">{expense.description}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Amount</h3>
            <p className="mt-1 text-lg">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(expense.amount)}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date</h3>
            <p className="mt-1 text-lg">
              {new Date(expense.date).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Category</h3>
            <p className="mt-1 text-lg">{expense.category}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <p className="mt-1 text-lg">
              {expense.is_extraordinary ? 'Extraordinary' : 'Ordinary'}
            </p>
          </div>
          
          {expense.receipt_url && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Receipt</h3>
              <a 
                href={expense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-blue-600 hover:text-blue-800"
              >
                View Receipt
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}