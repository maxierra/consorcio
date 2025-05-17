import { useState } from 'react';
import AdministrationForm from '../../components/AdministrationForm';

import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Administration {
  id: string;
  name: string;
  cuit: string;
  registration_number: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  email: string;
  phone: string;
}

export default function Administration() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [administrations, setAdministrations] = useState<Administration[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('Estado inicial del componente:', {
    isFormOpen,
    administrations,
    loading
  });

  const fetchAdministrations = async () => {
    try {
      console.log('Iniciando fetchAdministrations...');
      const { data, error } = await supabase
        .from('administration')
        .select('*');

      console.log('Respuesta de Supabase:', { data, error });

      if (error) throw error;
      console.log('Actualizando estado con datos:', data || []);
      setAdministrations(data || []);
      console.log('Estado actualizado de administrations:', data || []);
    } catch (error) {
      console.error('Error al cargar los datos:', error);
    } finally {
      console.log('Finalizando carga, estableciendo loading a false');
      setLoading(false);
  };

  useEffect(() => {
    fetchAdministrations();
  }, []);

  const handleSuccess = () => {
    fetchAdministrations();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configuración de Administración</h1>
      
      <button
        onClick={() => setIsFormOpen(true)}
        className="bg-primary-600 text-white py-2 px-4 rounded hover:bg-primary-700 mb-6"
      >
        Agregar Administración
      </button>

      {loading ? (
        <div className="text-center">Cargando datos...</div>
      ) : administrations.length === 0 ? (
        <div className="text-center text-gray-500">No hay datos de administración registrados</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CUIT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Inscripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado/Provincia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código Postal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {administrations.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.cuit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.registration_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.city}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.state}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.postal_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdministrationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}