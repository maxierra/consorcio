import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Trash2, Edit, Home, Building, Ban as Bank } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Condominium } from '../../types/condominium';
import { Button } from '../../components/ui/Button';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';

interface CondominiumWithUnits extends Condominium {
  units_count: number;
}

// Define color schemes for cards
const cardColors = [
  { bg: 'bg-rose-50', border: 'border-rose-200', hover: 'hover:bg-rose-100', icon: 'text-rose-500' },
  { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', icon: 'text-blue-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:bg-emerald-100', icon: 'text-emerald-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:bg-amber-100', icon: 'text-amber-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', hover: 'hover:bg-violet-100', icon: 'text-violet-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:bg-cyan-100', icon: 'text-cyan-500' },
];

export default function Condominiums() {
  const navigate = useNavigate();
  const [condominiums, setCondominiums] = useState<CondominiumWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCondominiumId, setSelectedCondominiumId] = useState<string | null>(null);

  useEffect(() => {
    fetchCondominiums();
  }, []);

  async function fetchCondominiums() {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select(`
          *,
          units_count:units(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const condominiumsWithCount = data?.map(condo => ({
        ...condo,
        units_count: condo.units_count[0].count
      })) || [];

      setCondominiums(condominiumsWithCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al cargar los consorcios');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCondominiumId(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCondominiumId) return;

    try {
      const { error } = await supabase
        .from('condominiums')
        .delete()
        .eq('id', selectedCondominiumId);

      if (error) throw error;
      await fetchCondominiums();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el consorcio');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consorcios</h1>
        <Link
          to="/consorcios/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Consorcio
        </Link>
      </div>

      {condominiums.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay consorcios</h3>
          <p className="mt-1 text-sm text-gray-500">Comience creando un nuevo consorcio.</p>
          <div className="mt-6">
            <Link
              to="/consorcios/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuevo Consorcio
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {condominiums.map((condominium, index) => {
            const colorScheme = cardColors[index % cardColors.length];
            return (
              <div
                key={condominium.id}
                className={`transition-all duration-200 border-2 rounded-lg overflow-hidden ${colorScheme.bg} ${colorScheme.border} ${colorScheme.hover}`}
              >
                <div className="p-6">
                  <div 
                    className="cursor-pointer"
                    onClick={() => navigate(`/consorcios/${condominium.id}`)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">{condominium.name}</h2>
                      {condominium.active && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activo
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{condominium.address}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Home className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                        <span>{condominium.units_count} unidades</span>
                      </div>

                      {condominium.tax_id && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                          <span>CUIT: {condominium.tax_id}</span>
                        </div>
                      )}

                      {condominium.bank_name && (
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <Bank className={`h-4 w-4 mr-2 ${colorScheme.icon}`} />
                            <span>{condominium.bank_name}</span>
                          </div>
                          {condominium.bank_account && (
                            <div className="ml-6 text-sm text-gray-500 mt-1">
                              Cuenta: {condominium.bank_account}
                            </div>
                          )}
                          {condominium.bank_cbu && (
                            <div className="ml-6 text-sm text-gray-500 mt-1">
                              CBU: {condominium.bank_cbu}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/consorcios/${condominium.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => handleDeleteClick(condominium.id, e)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="¿Eliminar consorcio?"
        message="Esta acción eliminará permanentemente el consorcio y todas sus unidades funcionales asociadas. Esta acción no se puede deshacer."
      />
    </div>
  );
}