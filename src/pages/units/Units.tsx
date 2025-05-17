import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../../components/ui/Button';

interface Unit {
  id: string;
  number: string;
  type: string;
  owner_name: string;
  coefficient: number;
  condominium_id: string;
}

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnits();
  }, []);

  async function fetchUnits() {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('number');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error al cargar unidades:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Unidades Funcionales</h1>
        <Link to="/units/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Unidad
          </Button>
        </Link>
      </div>

      {units.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay unidades</h3>
          <p className="mt-1 text-sm text-gray-500">Comience creando una nueva unidad funcional.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coeficiente
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {units.map((unit) => (
                <tr
                  key={unit.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.location.href = `/units/${unit.id}`}
                >
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
                    {unit.coefficient.toFixed(6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}