import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { FileText, Building, DollarSign, Calendar } from 'lucide-react';

interface Fee {
  id: string;
  month: number;
  year: number;
  total_amount: number;
  generated_date: string;
  pdf_url: string | null;
  condominium: {
    name: string;
  };
}

interface UnitFee {
  id: string;
  amount: number;
  is_paid: boolean;
  payment_date: string | null;
  unit: {
    number: string;
    owner_name: string;
  };
}

export default function FeeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [fee, setFee] = useState<Fee | null>(null);
  const [unitFees, setUnitFees] = useState<UnitFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchFeeDetails();
    }
  }, [id]);

  async function fetchFeeDetails() {
    try {
      // Fetch fee details
      const { data: feeData, error: feeError } = await supabase
        .from('fees')
        .select(`
          *,
          condominium:condominiums(name)
        `)
        .eq('id', id)
        .single();

      if (feeError) throw feeError;

      // Fetch unit fees
      const { data: unitFeesData, error: unitFeesError } = await supabase
        .from('unit_fees')
        .select(`
          *,
          unit:units(number, owner_name)
        `)
        .eq('fee_id', id)
        .order('unit(number)');

      if (unitFeesError) throw unitFeesError;

      setFee(feeData);
      setUnitFees(unitFeesData || []);
    } catch (error) {
      console.error('Error fetching fee details:', error);
      navigate('/fees');
    } finally {
      setLoading(false);
    }
  }

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="text-center text-gray-500 mt-8">
        Fee not found.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">Period</div>
              <div className="font-semibold">{getMonthName(fee.month)} {fee.year}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Building className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">Condominium</div>
              <div className="font-semibold">{fee.condominium.name}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <DollarSign className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="font-semibold">${fee.total_amount.toFixed(2)}</div>
            </div>
          </div>

          {fee.pdf_url && (
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <a
                href={fee.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                View PDF
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {unitFees.map((unitFee) => (
              <tr key={unitFee.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {unitFee.unit.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {unitFee.unit.owner_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${unitFee.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    unitFee.is_paid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {unitFee.is_paid ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {unitFee.payment_date
                    ? new Date(unitFee.payment_date).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}