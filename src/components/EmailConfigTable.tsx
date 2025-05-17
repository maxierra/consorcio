import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PencilIcon, InformationCircleIcon, EnvelopeIcon } from '@heroicons/react/24/solid';

interface EmailConfig {
  id: string;
  service: string;
  host?: string;
  port?: number;
  secure: boolean;
  user_email: string;
  password: string;
  from_name: string;
  default_subject: string;
  default_template: string;
  created_at: string;
  updated_at: string;
}

interface EmailConfigTableProps {
  onEdit: (config: EmailConfig) => void;
  triggerRefresh: number;
}

export default function EmailConfigTable({ onEdit, triggerRefresh }: EmailConfigTableProps) {
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmailConfigs();
  }, [triggerRefresh]);

  const fetchEmailConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_configuration')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailConfigs(data || []);
    } catch (err) {
      console.error('Error fetching email configurations:', err);
      setError('No se pudieron cargar las configuraciones de correo');
    } finally {
      setLoading(false);
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
  
  if (emailConfigs.length === 0) return (
    <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-col items-center justify-center">
        <EnvelopeIcon className="h-16 w-16 text-blue-400 mb-4" />
        <p className="text-gray-700 text-lg font-medium">No hay configuración de correo electrónico</p>
        <p className="text-gray-500 mt-2 max-w-md">Configura los parámetros para el envío de correos electrónicos desde el sistema.</p>
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
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Servicio</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">Remitente</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {emailConfigs.map((config) => (
                <tr key={config.id} className="hover:bg-blue-50 transition-colors duration-150 ease-in-out">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                        {config.service.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-base font-medium text-gray-900 capitalize">{config.service}</div>
                        {config.service === 'smtp' && (
                          <div className="text-sm text-gray-500">
                            {config.host}:{config.port} {config.secure ? '(SSL)' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{config.user_email}</div>
                    <div className="text-sm text-gray-500">
                      {config.default_subject ? `Asunto: ${config.default_subject}` : 'Sin asunto predeterminado'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{config.from_name || 'No especificado'}</div>
                    <div className="text-sm text-gray-500">
                      {config.default_template ? 'Plantilla configurada' : 'Sin plantilla'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(config)}
                      className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 shadow-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Editar
                    </button>
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
