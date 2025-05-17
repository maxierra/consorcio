import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Components
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import EmployeeCompensation from './EmployeeCompensation';

interface Condominium {
  id: string;
  name: string;
}

const CreateEmployee = () => {
  const navigate = useNavigate();
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondominiums, setSelectedCondominiums] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCompensation, setShowCompensation] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchCondominiums();
    }
  }, [user, navigate]);

  const fetchCondominiums = async () => {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCondominiums(data || []);
    } catch (err) {
      console.error('Error al obtener consorcios:', err);
      setError('Error al cargar los consorcios');
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    position: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Insertar empleado
      const { data: newEmployee, error: employeeError } = await supabase
        .from('employees')
        .insert([{ ...formData, user_id: user.id }])
        .select()
        .single();

      if (employeeError) throw employeeError;
      if (!newEmployee) throw new Error('Error al crear empleado');

      // Insertar asociaciones con consorcios
      if (selectedCondominiums.length > 0) {
        const { error: associationError } = await supabase
          .from('employee_condominiums')
          .insert(
            selectedCondominiums.map(condominiumId => ({
              employee_id: newEmployee.id,
              condominium_id: condominiumId
            }))
          );

        if (associationError) throw associationError;
      }

      setNewEmployeeId(newEmployee.id);
      setShowCompensation(true);
    } catch (error) {
      console.error('Error al crear empleado:', error);
      setError(error instanceof Error ? error.message : 'Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {showCompensation && newEmployeeId ? (
        <EmployeeCompensation
          employeeId={newEmployeeId}
          onClose={() => {
            setShowCompensation(false);
            navigate('/employees');
          }}
        />
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-6">Create New Employee</h1>
      
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700 mb-1">
              Tax ID
            </label>
            <Input
              id="tax_id"
              name="tax_id"
              type="text"
              value={formData.tax_id}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <Input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
              Position *
            </label>
            <Input
              id="position"
              name="position"
              type="text"
              required
              value={formData.position}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consorcios *
            </label>
            <div className="space-y-2">
              {condominiums.map((condominium) => (
                <div key={condominium.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`condominium-${condominium.id}`}
                    checked={selectedCondominiums.includes(condominium.id)}
                    onChange={() => {
                      setSelectedCondominiums(prev =>
                        prev.includes(condominium.id)
                          ? prev.filter(id => id !== condominium.id)
                          : [...prev, condominium.id]
                      );
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`condominium-${condominium.id}`}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {condominium.name}
                  </label>
                </div>
              ))}
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/employees')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedCondominiums.length === 0}
            >
              {loading ? 'Creando...' : 'Crear Empleado'}
            </Button>
          </div>
        </form>
      </Card>
        </>
      )}
    </div>
  );
};

export default CreateEmployee;