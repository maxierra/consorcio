import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import SuccessModal from '../../components/ui/SuccessModal';

export default function CreateCondominium() {
  const navigate = useNavigate();
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    tax_id: '',
    bank_info: '',
    bank_name: '',
    bank_account: '',
    bank_cbu: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('condominiums')
        .insert([
          {
            ...formData,
            user_id: user?.id,
          }
        ]);

      if (insertError) throw insertError;
      
      setShowSuccessModal(true);
      setFormData({
        name: '',
        address: '',
        tax_id: '',
        bank_info: '',
        bank_name: '',
        bank_account: '',
        bank_cbu: '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate('/consorcios');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/consorcios')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Crear Nuevo Consorcio</h1>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Consorcio</CardTitle>
              <CardDescription>Ingrese los detalles del consorcio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre del Consorcio
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Consorcio MONROE 3402"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Dirección
                </label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ej: MONROE 3402, Belgrano, C.A.B.A."
                  required
                />
              </div>

              <div>
                <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700">
                  CUIT
                </label>
                <Input
                  id="tax_id"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleChange}
                  placeholder="Ej: 30-55595610-6"
                />
              </div>

              <div>
                <label htmlFor="bank_info" className="block text-sm font-medium text-gray-700">
                  Clave SUTERH
                </label>
                <Input
                  id="bank_info"
                  name="bank_info"
                  value={formData.bank_info}
                  onChange={handleChange}
                  placeholder="Ej: 48871"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información Bancaria</CardTitle>
              <CardDescription>Datos para transferencias bancarias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700">
                  Banco
                </label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="Ej: Banco Galicia"
                />
              </div>

              <div>
                <label htmlFor="bank_account" className="block text-sm font-medium text-gray-700">
                  Número de Cuenta
                </label>
                <Input
                  id="bank_account"
                  name="bank_account"
                  value={formData.bank_account}
                  onChange={handleChange}
                  placeholder="Ej: 15137-1 009-3"
                />
              </div>

              <div>
                <label htmlFor="bank_cbu" className="block text-sm font-medium text-gray-700">
                  CBU
                </label>
                <Input
                  id="bank_cbu"
                  name="bank_cbu"
                  value={formData.bank_cbu}
                  onChange={handleChange}
                  placeholder="Ej: 0070009220000015137133"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/consorcios')}
            type="button"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Consorcio'}
          </Button>
        </div>
      </form>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        message="El consorcio ha sido creado exitosamente"
      />
    </div>
  );
}