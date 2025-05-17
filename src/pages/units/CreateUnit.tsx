import { useState, useEffect } from 'react';
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

interface Condominium {
  id: string;
  name: string;
}

export default function CreateUnit() {
  const navigate = useNavigate();
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);

  // Definir las categorías de expensas disponibles
  const EXPENSE_CATEGORIES = [
    { value: 'expensas_ordinarias_a', label: 'Expensas Ordinarias A' },
    { value: 'expensas_ordinarias_b', label: 'Expensas Ordinarias B' },
    { value: 'expensas_aysa', label: 'Expensas Aysa' }
  ];

  const [formData, setFormData] = useState({
    number: '',
    type: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    coefficient: '',
    condominium_id: '',
    expense_categories: ['expensas_ordinarias_a', 'expensas_aysa'] // Categorías por defecto
  });

  useEffect(() => {
    const fetchCondominiums = async () => {
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setCondominiums(data);
      }
    };

    fetchCondominiums();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Asegurarse de que expense_categories no esté vacío
      if (formData.expense_categories.length === 0) {
        // Si no se seleccionó ninguna categoría, usar las categorías predeterminadas según el tipo
        let defaultCategories = ['expensas_ordinarias_a', 'expensas_aysa'];
        if (formData.type.toLowerCase().includes('departamento') || formData.type === '4') {
          defaultCategories.push('expensas_ordinarias_b');
        }
        formData.expense_categories = defaultCategories;
      }

      const { error: insertError } = await supabase
        .from('units')
        .insert([
          {
            ...formData,
            coefficient: parseFloat(formData.coefficient)
          }
        ]);

      if (insertError) throw insertError;
      navigate('/units');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('handleChange called:', name, value);
    
    // Si cambia el tipo de unidad, preseleccionar las categorías de expensas
    if (name === 'type') {
      let defaultCategories: string[] = [];
      
      // Categorías base que todos pagan
      defaultCategories.push('expensas_ordinarias_a', 'expensas_aysa');
      
      // Si es departamento, añadir expensas B
      if (value.toLowerCase().includes('departamento') || value === '4') {
        defaultCategories.push('expensas_ordinarias_b');
      }
      
      console.log('Setting default categories:', defaultCategories);
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        expense_categories: defaultCategories
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Mostrar el estado actual del formulario después de la actualización
    setTimeout(() => {
      console.log('Current formData:', formData);
    }, 0);
  };
  
  // Manejar cambios en los checkboxes de categorías
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setFormData(prev => {
      const categories = [...prev.expense_categories];
      
      if (checked && !categories.includes(value)) {
        categories.push(value);
      } else if (!checked && categories.includes(value)) {
        const index = categories.indexOf(value);
        categories.splice(index, 1);
      }
      
      return {
        ...prev,
        expense_categories: categories
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/units')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Nueva Unidad Funcional</h1>
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
              <CardTitle>Información de la Unidad</CardTitle>
              <CardDescription>Ingrese los detalles de la unidad funcional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="condominium_id" className="block text-sm font-medium text-gray-700">
                  Consorcio
                </label>
                <select
                  id="condominium_id"
                  name="condominium_id"
                  value={formData.condominium_id}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="">Seleccione un consorcio</option>
                  {condominiums.map(condo => (
                    <option key={condo.id} value={condo.id}>
                      {condo.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700">
                  Número
                </label>
                <Input
                  id="number"
                  name="number"
                  value={formData.number}
                  onChange={handleChange}
                  placeholder="Ej: 1"
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <Input
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="Ej: 4 o LOCAL o COCHERA"
                  required
                />
              </div>

              <div>
                <label htmlFor="coefficient" className="block text-sm font-medium text-gray-700">
                  Coeficiente
                </label>
                <Input
                  id="coefficient"
                  name="coefficient"
                  type="number"
                  step="0.000001"
                  value={formData.coefficient}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Categorías de expensas aplicables
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {EXPENSE_CATEGORIES.map(category => {
                    const isChecked = (formData.expense_categories || []).includes(category.value);
                    return (
                      <div key={category.value} className="flex items-center mb-3 last:mb-0">
                        <input
                          type="checkbox"
                          id={category.value}
                          name="expense_categories"
                          value={category.value}
                          checked={isChecked}
                          onChange={handleCategoryChange}
                          className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={category.value} className="ml-3 block text-sm font-medium text-gray-700">
                          {category.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Seleccione las categorías de expensas que aplican a esta unidad.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información del Propietario</CardTitle>
              <CardDescription>Ingrese los datos del propietario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="owner_name" className="block text-sm font-medium text-gray-700">
                  Nombre del Propietario
                </label>
                <Input
                  id="owner_name"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  placeholder="Ej: RODRIGUEZ, JUAN"
                  required
                />
              </div>

              <div>
                <label htmlFor="owner_email" className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                <Input
                  id="owner_email"
                  name="owner_email"
                  type="email"
                  value={formData.owner_email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="owner_phone" className="block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <Input
                  id="owner_phone"
                  name="owner_phone"
                  value={formData.owner_phone}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/units')}
            type="button"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Unidad'}
          </Button>
        </div>
      </form>
    </div>
  );
}