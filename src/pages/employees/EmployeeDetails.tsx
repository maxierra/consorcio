import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface Employee {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  position: string;
  active: boolean;
  created_at: string;
}

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setEmployee(data);
      } catch (error) {
        console.error('Error fetching employee:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-semibold mb-4">Employee not found</h2>
        <Button onClick={() => navigate('/employees')}>Back to Employees</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Employee Details</h1>
        <div className="space-x-4">
          <Button onClick={() => navigate(`/employees/${id}/compensations`)}>            Ver Remuneraciones
          </Button>
          <Button onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
        </div>
      </div>

      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">{employee.name}</h2>
              <p className="text-gray-600">{employee.position}</p>
            </div>
            <Badge variant={employee.active ? "success" : "error"}>
              {employee.active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Email:</span> {employee.email || 'Not provided'}</p>
                <p><span className="font-medium">Phone:</span> {employee.phone || 'Not provided'}</p>
                <p><span className="font-medium">Address:</span> {employee.address || 'Not provided'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Additional Information</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Tax ID:</span> {employee.tax_id || 'Not provided'}</p>
                <p><span className="font-medium">Start Date:</span> {new Date(employee.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}