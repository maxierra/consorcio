import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Administration {
  id?: string;
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

interface AdministrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  administrationToEdit?: Administration | null;
}

export default function AdministrationForm({ isOpen, onClose, onSuccess, administrationToEdit }: AdministrationFormProps) {
  const [formData, setFormData] = useState<Administration>({
    name: '',
    cuit: '',
    registration_number: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const isEditing = !!administrationToEdit?.id;

  // Cargar datos cuando se está editando
  useEffect(() => {
    if (administrationToEdit) {
      setFormData(administrationToEdit);
    } else {
      // Resetear el formulario cuando se abre para crear nuevo
      setFormData({
        name: '',
        cuit: '',
        registration_number: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        email: '',
        phone: ''
      });
    }
  }, [administrationToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
          .from('administration')
          .update({
            name: formData.name,
            cuit: formData.cuit,
            registration_number: formData.registration_number,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            email: formData.email,
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id);
        
        dbError = error;
      } else {
        // Insertar nuevo registro
        const { error } = await supabase
          .from('administration')
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
      setError(`Error al ${isEditing ? 'actualizar' : 'guardar'} los datos`);
      console.error(err);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg max-w-md w-full">
          <h3 className="text-lg font-medium text-green-600 mb-2">Éxito</h3>
          <p>Los datos de la administración se han guardado correctamente.</p>
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
            {isEditing ? 'Editar' : 'Cargar'} Datos de Administración
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
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CUIT</label>
            <input
              type="text"
              name="cuit"
              value={formData.cuit}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Número de Inscripción</label>
            <input
              type="text"
              name="registration_number"
              value={formData.registration_number}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ciudad</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estado/Provincia</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Código Postal</label>
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md p-2.5 shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
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
