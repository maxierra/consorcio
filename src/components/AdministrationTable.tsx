import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TrashIcon, PencilIcon, InformationCircleIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/solid';

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

interface AdministrationTableProps {
  onEdit: (administration: Administration) => void;
  triggerRefresh: number;
}

export default function AdministrationTable({ onEdit, triggerRefresh }: AdministrationTableProps) {
  const [administrations, setAdministrations] = useState<Administration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdministrations();
  }, [triggerRefresh]);

  const fetchAdministrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('administration')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdministrations(data || []);
    } catch (err) {
      console.error('Error fetching administrations:', err);
      setError('No se pudieron cargar los datos de administración');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro que desea eliminar este registro?')) return;

    try {
      const { error } = await supabase
        .from('administration')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Actualizar la lista después de eliminar
      setAdministrations(administrations.filter(admin => admin.id !== id));
    } catch (err) {
      console.error('Error deleting administration:', err);
      alert('Error al eliminar el registro');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-full bg-blue-200 h-12 w-12"></div>
        <div className="flex-1 space-y-6 py-1">
          <div className="h-3 bg-blue-200 rounded"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-3 bg-blue-200 rounded col-span-2"></div>
              <div className="h-3 bg-blue-200 rounded col-span-1"></div>
            </div>
            <div className="h-3 bg-blue-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4 my-4 shadow-md">
      <div className="flex items-center">
        <InformationCircleIcon className="h-6 w-6 text-red-500 mr-2" />
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    </div>
  );
  
  if (administrations.length === 0) return (
    <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-col items-center justify-center">
        <InformationCircleIcon className="h-16 w-16 text-blue-400 mb-4" />
        <p className="text-gray-700 text-lg font-medium">No hay datos de administración registrados</p>
        <p className="text-gray-500 mt-2 max-w-md">Utiliza el botón "Cargar Datos" para agregar la información de la administración del consorcio.</p>
      </div>
    </div>
  );

  return (
    <div className="mt-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-700">
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">CUIT</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Dirección</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Contacto</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {administrations.map((admin, index) => (
                <tr key={admin.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150 ease-in-out`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-base font-medium text-gray-900">{admin.name}</div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <InformationCircleIcon className="h-4 w-4 text-blue-500 mr-1" />
                          N° Reg: {admin.registration_number}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1.5 inline-flex text-sm font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                      {admin.cuit}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{admin.address}</div>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      <MapPinIcon className="h-4 w-4 text-blue-500 mr-1" />
                      {admin.city}, {admin.state} {admin.postal_code}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 text-blue-500 mr-1" />
                        <a href={`mailto:${admin.email}`} className="hover:text-blue-600 hover:underline transition-colors">
                          {admin.email}
                        </a>
                      </div>
                      <div className="text-gray-500 flex items-center mt-1">
                        <PhoneIcon className="h-4 w-4 text-blue-500 mr-1" />
                        <a href={`tel:${admin.phone}`} className="hover:text-blue-600 hover:underline transition-colors">
                          {admin.phone}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onEdit(admin)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 shadow-sm"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-200 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-150 shadow-sm"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
