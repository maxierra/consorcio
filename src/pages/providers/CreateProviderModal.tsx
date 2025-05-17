import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface Provider {
  id: string;
  name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  active: boolean;
}

interface Condominium {
  id: string;
  name: string;
}

interface CreateProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  provider?: Provider | null;
  isEditing?: boolean;
}

export default function CreateProviderModal({
  isOpen,
  onClose,
  onSuccess,
  provider,
  isEditing
}: CreateProviderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondominiums, setSelectedCondominiums] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    fetchCondominiums();
    if (provider && isEditing) {
      setFormData({
        name: provider.name || '',
        tax_id: provider.tax_id || '',
        address: provider.address || '',
        phone: provider.phone || '',
        email: provider.email || '',
        notes: provider.notes || ''
      });
      fetchProviderCondominiums(provider.id);
    } else {
      setFormData({
        name: '',
        tax_id: '',
        address: '',
        phone: '',
        email: '',
        notes: ''
      });
      setSelectedCondominiums([]);
    }
  }, [provider, isEditing]);

  const fetchCondominiums = async () => {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCondominiums(data || []);
    } catch (err) {
      console.error('Error fetching condominiums:', err);
    }
  };

  const fetchProviderCondominiums = async (providerId: string) => {
    try {
      const { data, error } = await supabase
        .from('provider_condominiums')
        .select('condominium_id')
        .eq('provider_id', providerId);

      if (error) throw error;
      
      if (data) {
        setSelectedCondominiums(data.map(pc => pc.condominium_id));
      } else {
        setSelectedCondominiums([]);
      }
    } catch (err) {
      console.error('Error cargando consorcios del proveedor:', err);
      setError('Error al cargar los consorcios del proveedor');
      setSelectedCondominiums([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const providerData = {
        ...formData,
        user_id: user.id,
        active: true
      };

      let providerId: string;

      if (isEditing && provider) {
        // Actualizar proveedor existente
        const { error: updateError } = await supabase
          .from('providers')
          .update(providerData)
          .eq('id', provider.id);

        if (updateError) throw updateError;
        providerId = provider.id;
      } else {
        // Crear nuevo proveedor
        const { data: newProvider, error: insertError } = await supabase
          .from('providers')
          .insert([providerData])
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!newProvider) throw new Error('No se pudo crear el proveedor');
        providerId = newProvider.id;
      }

      // Actualizar relaciones con consorcios
      await updateProviderCondominiums(providerId);

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCondominiumToggle = (condominiumId: string) => {
    setSelectedCondominiums(prev => {
      if (prev.includes(condominiumId)) {
        return prev.filter(id => id !== condominiumId);
      } else {
        return [...prev, condominiumId];
      }
    });
  };

  const updateProviderCondominiums = async (providerId: string) => {
    try {
      // 1. Obtener relaciones actuales
      const { data: currentRelations, error: fetchError } = await supabase
        .from('provider_condominiums')
        .select('condominium_id')
        .eq('provider_id', providerId);

      if (fetchError) throw fetchError;

      const currentCondominiumIds = currentRelations?.map(r => r.condominium_id) || [];
      const condominiumsToAdd = selectedCondominiums.filter(id => !currentCondominiumIds.includes(id));
      const condominiumsToRemove = currentCondominiumIds.filter(id => !selectedCondominiums.includes(id));

      // 2. Eliminar relaciones que ya no están seleccionadas
      if (condominiumsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('provider_condominiums')
          .delete()
          .eq('provider_id', providerId)
          .in('condominium_id', condominiumsToRemove);

        if (deleteError) throw deleteError;
      }

      // 3. Agregar nuevas relaciones
      if (condominiumsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('provider_condominiums')
          .insert(
            condominiumsToAdd.map(condoId => ({
              provider_id: providerId,
              condominium_id: condoId
            }))
          );

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Error actualizando relaciones con consorcios:', err);
      throw err;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                {error && (
                  <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <Input
                    label="Nombre"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="CUIT"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleChange}
                  />
                  <Input
                    label="Dirección"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                  <Input
                    label="Teléfono"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notas
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      value={formData.notes}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asignar a Consorcios
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {condominiums.map(condominium => (
                        <label
                          key={condominium.id}
                          className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCondominiums.includes(condominium.id)}
                            onChange={() => handleCondominiumToggle(condominium.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{condominium.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar'}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}