import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Unit } from '../../types/unit';
import { Building, User, Phone, Mail, Percent } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card';
import Input from '../../components/ui/Input';

// Definir las categorías de expensas disponibles
const EXPENSE_CATEGORIES = [
  { value: 'expensas_ordinarias_a', label: 'Expensas Ordinarias A' },
  { value: 'expensas_ordinarias_b', label: 'Expensas Ordinarias B' },
  { value: 'expensas_aysa', label: 'Expensas Aysa' }
];

interface UnitWithDetails extends Unit {
  condominiums?: {
    name: string;
  };
}

export default function UnitDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { supabase } = useAuth();
  const [unit, setUnit] = useState<UnitWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UnitWithDetails>>({});

  useEffect(() => {
    if (id === 'new') {
      navigate('/units/create');
      return;
    }

    fetchUnit();
  }, [id, supabase, navigate]);

  const fetchUnit = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          condominiums (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setUnit(data);
      setEditForm(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(unit || {});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Manejar cambios en los checkboxes de categorías
  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setEditForm(prev => {
      const categories = [...(prev.expense_categories || [])];
      
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

  const handleSave = async () => {
    try {
      // Asegurarse de que expense_categories no esté vacío
      if (!editForm.expense_categories || editForm.expense_categories.length === 0) {
        // Si no se seleccionó ninguna categoría, usar las categorías predeterminadas según el tipo
        let defaultCategories = ['expensas_ordinarias_a', 'expensas_aysa'];
        if (editForm.type?.toLowerCase().includes('departamento') || editForm.type === '4') {
          defaultCategories.push('expensas_ordinarias_b');
        }
        editForm.expense_categories = defaultCategories;
      }

      const { error } = await supabase
        .from('units')
        .update({
          number: editForm.number,
          type: editForm.type,
          owner_name: editForm.owner_name,
          owner_email: editForm.owner_email,
          owner_phone: editForm.owner_phone,
          coefficient: editForm.coefficient,
          expense_categories: editForm.expense_categories,
        })
        .eq('id', id);

      if (error) throw error;

      await fetchUnit();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Está seguro que desea eliminar esta unidad funcional?')) {
      try {
        const { error } = await supabase
          .from('units')
          .delete()
          .eq('id', id);

        if (error) throw error;
        navigate('/units');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Unidad no encontrada</h2>
        <p className="mt-2 text-gray-600">La unidad que busca no existe o no tiene acceso a ella.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/units')}
        >
          Volver a Unidades
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/units')}
          >
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Unidad {unit.number}
            </h1>
            <p className="text-sm text-gray-500">
              {unit.condominiums?.name}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={handleEdit}>
                Editar
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Unidad</CardTitle>
            <CardDescription>Detalles básicos de la unidad funcional</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label="Número"
                  name="number"
                  value={editForm.number || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Tipo"
                  name="type"
                  value={editForm.type || ''}
                  onChange={handleChange}
                  placeholder="Ej: 4 o LOCAL o COCHERA"
                />
                <Input
                  label="Coeficiente"
                  name="coefficient"
                  type="number"
                  step="0.000001"
                  value={editForm.coefficient || ''}
                  onChange={handleChange}
                />
                
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Categorías de expensas aplicables
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {EXPENSE_CATEGORIES.map(category => (
                      <div key={category.value} className="flex items-center mb-3 last:mb-0">
                        <input
                          type="checkbox"
                          id={category.value}
                          name="expense_categories"
                          value={category.value}
                          checked={(editForm.expense_categories || []).includes(category.value)}
                          onChange={handleCategoryChange}
                          className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={category.value} className="ml-3 block text-sm font-medium text-gray-700">
                          {category.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Seleccione las categorías de expensas que aplican a esta unidad.
                  </p>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-4">
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Building className="h-4 w-4 mr-2" />
                    Número
                  </dt>
                  <dd className="text-sm text-gray-900">{unit.number}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Building className="h-4 w-4 mr-2" />
                    Tipo
                  </dt>
                  <dd className="text-sm text-gray-900">{unit.type}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Percent className="h-4 w-4 mr-2" />
                    Coeficiente
                  </dt>
                  <dd className="text-sm text-gray-900">{unit.coefficient}</dd>
                </div>
                <div className="flex flex-col py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 mb-2">
                    Categorías de expensas aplicables
                  </dt>
                  <dd className="text-sm text-gray-900">
                    <div className="flex flex-wrap gap-2">
                      {(unit.expense_categories || []).map(categoryValue => {
                        const category = EXPENSE_CATEGORIES.find(c => c.value === categoryValue);
                        return (
                          <span key={categoryValue} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            {category ? category.label : categoryValue}
                          </span>
                        );
                      })}
                    </div>
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Propietario</CardTitle>
            <CardDescription>Datos de contacto del propietario</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label="Nombre del Propietario"
                  name="owner_name"
                  value={editForm.owner_name || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Correo Electrónico"
                  name="owner_email"
                  type="email"
                  value={editForm.owner_email || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Teléfono"
                  name="owner_phone"
                  value={editForm.owner_phone || ''}
                  onChange={handleChange}
                />
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-4">
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <User className="h-4 w-4 mr-2" />
                    Propietario
                  </dt>
                  <dd className="text-sm text-gray-900">{unit.owner_name}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </dt>
                  <dd className="text-sm text-gray-900">{unit.owner_email || 'No proporcionado'}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Phone className="h-4 w-4 mr-2" />
                    Teléfono
                  </dt>
                  <dd className="text-sm text-gray-900">{unit.owner_phone || 'No proporcionado'}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
