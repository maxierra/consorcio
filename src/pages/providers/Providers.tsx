import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Mail, Phone, MapPin, Pencil, Trash2, Building } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import CreateProviderModal from './CreateProviderModal';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';

interface Provider {
  id: string;
  name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  active: boolean;
  condominiums?: {
    id: string;
    name: string;
  }[];
}

// Define color schemes for cards
const cardColors = [
  { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', icon: 'text-blue-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:bg-emerald-100', icon: 'text-emerald-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', hover: 'hover:bg-violet-100', icon: 'text-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:bg-amber-100', icon: 'text-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', hover: 'hover:bg-rose-100', icon: 'text-rose-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:bg-cyan-100', icon: 'text-cyan-500' },
];

export default function Providers() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data, error } = await supabase
        .from('providers')
        .select(`
          *,
          condominiums:provider_condominiums(
            condominium:condominiums(
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const transformedData = data?.map(provider => ({
        ...provider,
        condominiums: (provider.condominiums || [])
          .map((pc: { condominium: { id: string; name: string } | null }) => pc.condominium)
          .filter((condo: { id: string; name: string } | null): condo is { id: string; name: string } => condo !== null)
      })) || [];

      setProviders(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (provider: Provider, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProvider(provider);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    if (!selectedProvider) return;

    try {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', selectedProvider.id);

      if (error) throw error;
      
      await fetchProviders();
      setShowDeleteModal(false);
      setSelectedProvider(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el proveedor');
    }
  };

  const handleDeleteClick = (provider: Provider, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProvider(provider);
    setShowDeleteModal(true);
  };

  const handleProviderClick = (provider: Provider) => {
    navigate(`/providers/${provider.id}/invoices`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <Button onClick={() => {
          setIsEditing(false);
          setSelectedProvider(null);
          setShowCreateModal(true);
        }}>
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay proveedores</h3>
          <p className="mt-1 text-sm text-gray-500">Comience agregando un nuevo proveedor.</p>
          <div className="mt-6">
            <Button onClick={() => {
              setIsEditing(false);
              setSelectedProvider(null);
              setShowCreateModal(true);
            }}>
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Proveedor
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider, index) => {
            const colorScheme = cardColors[index % cardColors.length];
            return (
              <Card 
                key={provider.id} 
                className={`transition-all duration-200 cursor-pointer border-2 ${colorScheme.bg} ${colorScheme.border} ${colorScheme.hover}`}
                onClick={() => handleProviderClick(provider)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-semibold">
                    {provider.name}
                  </CardTitle>
                  <Badge variant={provider.active ? 'success' : 'warning'}>
                    {provider.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {provider.tax_id && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>CUIT: {provider.tax_id}</span>
                      </div>
                    )}
                    {provider.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{provider.email}</span>
                      </div>
                    )}
                    {provider.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{provider.phone}</span>
                      </div>
                    )}
                    {provider.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{provider.address}</span>
                      </div>
                    )}
                    
                    {provider.condominiums && provider.condominiums.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Building className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                          <span>Consorcios asociados:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {provider.condominiums.map((condo) => (
                            <Badge key={condo.id} variant="info">
                              {condo.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleEdit(provider, e)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => handleDeleteClick(provider, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateProviderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setIsEditing(false);
          setSelectedProvider(null);
        }}
        onSuccess={() => {
          setShowCreateModal(false);
          setIsEditing(false);
          setSelectedProvider(null);
          fetchProviders();
        }}
        provider={selectedProvider}
        isEditing={isEditing}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProvider(null);
        }}
        onConfirm={handleDelete}
        title="¿Eliminar proveedor?"
        message="Esta acción eliminará permanentemente el proveedor. Esta acción no se puede deshacer."
      />
    </div>
  );
}