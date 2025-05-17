import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Condominium } from '../../types/condominium';
import type { Unit } from '../../types/unit';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { ArrowLeft, Plus, Building, Trash2, Edit, Pencil, Upload, Ban as Bank } from 'lucide-react';
import ImportUnitsModal from '../../components/ui/ImportUnitsModal';
import AccountOpeningTable from '../../components/AccountOpeningTable';

// Definir las categorías de expensas disponibles con colores asignados
const EXPENSE_CATEGORIES = [
  { value: 'expensas_ordinarias_a', label: 'Expensas Ordinarias A', color: 'bg-blue-100 text-blue-800' },
  { value: 'expensas_ordinarias_b', label: 'Expensas Ordinarias B', color: 'bg-green-100 text-green-800' },
  { value: 'expensas_aysa', label: 'Expensas Aysa', color: 'bg-purple-100 text-purple-800' }
];

interface UnitFormData {
  number: string;
  type: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  coefficient: string;
  area: string;
  expense_categories: string[];
}

const initialUnitForm: UnitFormData = {
  number: '',
  type: '',
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  coefficient: '',
  area: '0',
  expense_categories: ['expensas_ordinarias_a', 'expensas_aysa']
};

export default function CondominiumDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [condominium, setCondominium] = useState<Condominium | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState<UnitFormData>(initialUnitForm);
  const [savingUnit, setSavingUnit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Condominium>>({name: '', address: '', tax_id: '', bank_info: '', bank_name: '', bank_account: '', bank_cbu: ''});
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchCondominiumData();
  }, [id]);

  async function fetchCondominiumData() {
    try {
      setLoading(true);
      console.log('Actualizando datos del consorcio...');

      // Fetch condominium details
      const { data: condominiumData, error: condominiumError } = await supabase
        .from('condominiums')
        .select('*')
        .eq('id', id)
        .single();

      if (condominiumError) throw condominiumError;

      // Fetch units for this condominium, including expense_categories
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('condominium_id', id);

      if (unitsError) throw unitsError;
      
      // Ordenar las unidades por número (considerando que pueden ser alfanuméricos)
      const sortedUnits = (unitsData || []).sort((a, b) => {
        const numA = a.number.replace(/\D/g, '').padStart(3, '0');
        const numB = b.number.replace(/\D/g, '').padStart(3, '0');
        return numA.localeCompare(numB);
      });
      
      console.log('Unidades obtenidas y ordenadas:', sortedUnits);

      setCondominium(condominiumData);
      setUnits(sortedUnits);
      setEditForm(condominiumData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del consorcio');
      console.error('Error al cargar datos:', err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  }

  const handleUnitFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUnitForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    console.log('Checkbox changed:', value, checked);
    
    setUnitForm(prev => {
      const categories = [...prev.expense_categories];
      
      if (checked && !categories.includes(value)) {
        categories.push(value);
      } else if (!checked && categories.includes(value)) {
        const index = categories.indexOf(value);
        categories.splice(index, 1);
      }
      
      console.log('New categories:', categories);
      
      return {
        ...prev,
        expense_categories: categories
      };
    });
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUnit(true);

    try {
      // Asegurarse de que expense_categories no esté vacío
      if (!unitForm.expense_categories || unitForm.expense_categories.length === 0) {
        // Si no se seleccionó ninguna categoría, usar las categorías predeterminadas según el tipo
        let defaultCategories = ['expensas_ordinarias_a', 'expensas_aysa'];
        if (unitForm.type.toLowerCase().includes('departamento') || unitForm.type === '4') {
          defaultCategories.push('expensas_ordinarias_b');
        }
        unitForm.expense_categories = defaultCategories;
      }
      
      // Preparar los datos asegurándonos de que los campos vacíos se envíen como null
      const unitData = {
        number: unitForm.number,
        type: unitForm.type,
        owner_name: unitForm.owner_name,
        owner_email: unitForm.owner_email || null,
        owner_phone: unitForm.owner_phone || null,
        area: parseFloat(unitForm.area || '0'),
        coefficient: parseFloat(unitForm.coefficient || '0'),
        condominium_id: id,
        expense_categories: unitForm.expense_categories
      };
      
      console.log('Datos a guardar:', unitData);

      if (editingUnitId) {
        console.log('Actualizando unidad:', editingUnitId);
        const { data, error: updateError } = await supabase
          .from('units')
          .update(unitData)
          .eq('id', editingUnitId);

        if (updateError) {
          console.error('Error al actualizar unidad:', updateError);
          throw updateError;
        }
        console.log('Unidad actualizada correctamente:', data);
      } else {
        console.log('Insertando nueva unidad');
        const { data, error: insertError } = await supabase
          .from('units')
          .insert([unitData]);

        if (insertError) {
          console.error('Error al insertar unidad:', insertError);
          throw insertError;
        }
        console.log('Unidad insertada correctamente:', data);
      }

      await fetchCondominiumData();
      setShowUnitForm(false);
      setUnitForm(initialUnitForm);
      setEditingUnitId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la unidad');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setUnitForm({
      number: unit.number,
      type: unit.type || '',
      owner_name: unit.owner_name,
      owner_email: unit.owner_email || '',
      owner_phone: unit.owner_phone || '',
      coefficient: unit.coefficient.toString(),
      area: unit.area.toString(),
      expense_categories: unit.expense_categories || ['expensas_ordinarias_a', 'expensas_aysa']
    });
    setEditingUnitId(unit.id);
    setShowUnitForm(true);
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (window.confirm('¿Está seguro que desea eliminar esta unidad funcional?')) {
      try {
        const { error } = await supabase
          .from('units')
          .delete()
          .eq('id', unitId);

        if (error) throw error;
        await fetchCondominiumData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar la unidad');
      }
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('condominiums')
        .update({
          name: editForm.name,
          address: editForm.address,
          tax_id: editForm.tax_id,
          bank_info: editForm.bank_info,
          bank_name: editForm.bank_name,
          bank_account: editForm.bank_account,
          bank_cbu: editForm.bank_cbu,
        })
        .eq('id', id);

      if (error) throw error;

      await fetchCondominiumData();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el consorcio');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Está seguro que desea eliminar este consorcio? Esta acción eliminará también todas las unidades asociadas.')) {
      try {
        const { error } = await supabase
          .from('condominiums')
          .delete()
          .eq('id', id);

        if (error) throw error;
        navigate('/consorcios');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar el consorcio');
      }
    }
  };

  const handleImportUnits = async (units: any[]) => {
    try {
      const { error } = await supabase
        .from('units')
        .insert(
          units.map(unit => ({
            ...unit,
            condominium_id: id
          }))
        );

      if (error) throw error;

      await fetchCondominiumData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar las unidades');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!condominium) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Consorcio no encontrado
        </div>
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
            onClick={() => navigate('/consorcios')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{condominium.name}</h1>
            <p className="text-sm text-gray-500">{condominium.address}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
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
            <CardTitle>Información del Consorcio</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  label="Nombre"
                  name="name"
                  value={editForm.name || ''}
                  onChange={handleEditChange}
                  required
                />
                <Input
                  label="Dirección"
                  name="address"
                  value={editForm.address || ''}
                  onChange={handleEditChange}
                  required
                />
                <Input
                  label="CUIT"
                  name="tax_id"
                  value={editForm.tax_id || ''}
                  onChange={handleEditChange}
                />
                <Input
                  label="Clave SUTERH"
                  name="bank_info"
                  value={editForm.bank_info || ''}
                  onChange={handleEditChange}
                />
                <Input
                  label="Banco"
                  name="bank_name"
                  value={editForm.bank_name || ''}
                  onChange={handleEditChange}
                />
                <Input
                  label="Número de Cuenta"
                  name="bank_account"
                  value={editForm.bank_account || ''}
                  onChange={handleEditChange}
                />
                <Input
                  label="CBU"
                  name="bank_cbu"
                  value={editForm.bank_cbu || ''}
                  onChange={handleEditChange}
                />
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-4">
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Building className="h-4 w-4 mr-2" />
                    CUIT
                  </dt>
                  <dd className="text-sm text-gray-900">{condominium.tax_id || 'No especificado'}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Building className="h-4 w-4 mr-2" />
                    Clave SUTERH
                  </dt>
                  <dd className="text-sm text-gray-900">{condominium.bank_info || 'No especificada'}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Bank className="h-4 w-4 mr-2" />
                    Banco
                  </dt>
                  <dd className="text-sm text-gray-900">{condominium.bank_name ?? 'No especificado'}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Bank className="h-4 w-4 mr-2" />
                    Número de Cuenta
                  </dt>
                  <dd className="text-sm text-gray-900">{condominium.bank_account ?? 'No especificado'}</dd>
                </div>
                <div className="flex items-center py-3 border-b border-gray-100">
                  <dt className="flex items-center text-sm font-medium text-gray-500 w-1/3">
                    <Bank className="h-4 w-4 mr-2" />
                    CBU
                  </dt>
                  <dd className="text-sm text-gray-900">{condominium.bank_cbu ?? 'No especificado'}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {showUnitForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingUnitId ? 'Editar Unidad Funcional' : 'Nueva Unidad Funcional'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnitSubmit} className="space-y-4">
                <Input
                  label="Número"
                  name="number"
                  value={unitForm.number}
                  onChange={handleUnitFormChange}
                  placeholder="Ej: 1"
                  required
                />
                <Input
                  label="Tipo"
                  name="type"
                  value={unitForm.type}
                  onChange={handleUnitFormChange}
                  placeholder="Ej: 4 o LOCAL o COCHERA"
                  required
                />
                <Input
                  label="Nombre del Propietario"
                  name="owner_name"
                  value={unitForm.owner_name}
                  onChange={handleUnitFormChange}
                  placeholder="Ej: RODRIGUEZ, JUAN"
                  required
                />
                <Input
                  label="Email del Propietario"
                  name="owner_email"
                  type="email"
                  value={unitForm.owner_email}
                  onChange={handleUnitFormChange}
                />
                <Input
                  label="Teléfono del Propietario"
                  name="owner_phone"
                  value={unitForm.owner_phone}
                  onChange={handleUnitFormChange}
                />
                <Input
                  label="Área (m²)"
                  name="area"
                  type="number"
                  step="0.01"
                  value={unitForm.area}
                  onChange={handleUnitFormChange}
                  required
                />
                <Input
                  label="Coeficiente"
                  name="coefficient"
                  type="number"
                  step="0.000001"
                  value={unitForm.coefficient}
                  onChange={handleUnitFormChange}
                  required
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
                          checked={(unitForm.expense_categories || []).includes(category.value)}
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
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowUnitForm(false);
                      setEditingUnitId(null);
                      setUnitForm(initialUnitForm);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingUnit}
                  >
                    {savingUnit ? 'Guardando...' : editingUnitId ? 'Guardar Cambios' : 'Guardar Unidad'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sección de Aperturas por Cuentas */}
      {id && <AccountOpeningTable condominiumId={id} />}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Unidades Funcionales</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar desde Excel
              </Button>
              <Button onClick={() => {
                setEditingUnitId(null);
                setUnitForm(initialUnitForm);
                setShowUnitForm(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Unidad
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propietario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coeficiente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorías</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {unit.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unit.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unit.owner_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unit.coefficient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {(unit.expense_categories || []).map(categoryValue => {
                          const category = EXPENSE_CATEGORIES.find(c => c.value === categoryValue);
                          return (
                            <span 
                              key={categoryValue} 
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${category ? category.color : 'bg-gray-100 text-gray-800'}`}
                              title={category ? category.label : categoryValue}
                            >
                              {category ? category.label.split(' ').pop() : categoryValue}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUnit(unit)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteUnit(unit.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {units.length === 0 && !showUnitForm && (
            <div className="text-center py-6">
              <p className="text-gray-500">No hay unidades funcionales registradas</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setShowUnitForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Unidad
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportUnitsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportUnits}
      />
    </div>
  );
}