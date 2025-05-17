import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface EmailConfig {
  id?: string;
  service: string;
  host?: string;
  port?: number;
  secure: boolean;
  user_email: string;
  password: string;
  from_name: string;
  default_subject: string;
  default_template: string;
}

interface EmailConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  configToEdit?: EmailConfig | null;
}

export default function EmailConfigForm({ isOpen, onClose, onSuccess, configToEdit }: EmailConfigFormProps) {
  const [formData, setFormData] = useState<EmailConfig>({
    service: 'gmail',
    secure: true,
    user_email: '',
    password: '',
    from_name: '',
    default_subject: '',
    default_template: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const isEditing = !!configToEdit?.id;

  // Cargar datos cuando se está editando
  useEffect(() => {
    if (configToEdit) {
      setFormData(configToEdit);
    } else {
      // Resetear el formulario cuando se abre para crear nuevo
      setFormData({
        service: 'gmail',
        secure: true,
        user_email: '',
        password: '',
        from_name: '',
        default_subject: '',
        default_template: ''
      });
    }
  }, [configToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : parseInt(value, 10)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let dbError;

      if (isEditing) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('email_configuration')
          .update({
            service: formData.service,
            host: formData.host,
            port: formData.port,
            secure: formData.secure,
            user_email: formData.user_email,
            password: formData.password,
            from_name: formData.from_name,
            default_subject: formData.default_subject,
            default_template: formData.default_template,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id);
        
        dbError = error;
      } else {
        // Insertar nuevo registro
        const { error } = await supabase
          .from('email_configuration')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        dbError = error;
      }

      if (dbError) throw dbError;

      setShowSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(`Error al ${isEditing ? 'actualizar' : 'guardar'} la configuración de correo`);
      console.error(err);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
          <h3 className="text-lg font-medium text-green-600 mb-2">Éxito</h3>
          <p>La configuración de correo electrónico se ha guardado correctamente.</p>
          <button
            onClick={() => {
              setShowSuccess(false);
              onClose();
              onSuccess();
            }}
            className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded hover:bg-primary-700"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl transform transition-all">
        <div className="flex items-center justify-between mb-6 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? 'Editar' : 'Configurar'} Correo Electrónico
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Servicio</label>
            <select
              name="service"
              value={formData.service}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="yahoo">Yahoo</option>
              <option value="smtp">SMTP Personalizado</option>
            </select>
          </div>
          
          {formData.service === 'smtp' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Host SMTP</label>
                <input
                  type="text"
                  name="host"
                  value={formData.host || ''}
                  onChange={handleChange}
                  required={formData.service === 'smtp'}
                  className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Puerto</label>
                <input
                  type="number"
                  name="port"
                  value={formData.port || ''}
                  onChange={handleChange}
                  required={formData.service === 'smtp'}
                  className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="secure"
                  name="secure"
                  checked={formData.secure}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="secure" className="ml-2 block text-sm text-gray-900">
                  Conexión segura (SSL/TLS)
                </label>
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="user_email"
              value={formData.user_email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña/Clave API</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Para Gmail, usa una "Contraseña de aplicación" generada en la configuración de seguridad de tu cuenta.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del Remitente</label>
            <input
              type="text"
              name="from_name"
              value={formData.from_name}
              onChange={handleChange}
              placeholder="Administración del Consorcio"
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Asunto Predeterminado</label>
            <input
              type="text"
              name="default_subject"
              value={formData.default_subject}
              onChange={handleChange}
              placeholder="Información del Consorcio"
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Plantilla de Mensaje Predeterminada</label>
            <textarea
              name="default_template"
              value={formData.default_template}
              onChange={handleChange}
              rows={5}
              placeholder="Estimado/a {nombre},&#10;&#10;Le informamos que...&#10;&#10;Saludos,&#10;Administración"
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Puedes usar {'{nombre}'}, {'{unidad}'}, etc. como variables que serán reemplazadas al enviar.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <span className="font-medium text-red-700">Error</span>
              <p className="mt-1 text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2.5 px-4 rounded-md shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : isEditing ? 'Actualizar' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 px-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
