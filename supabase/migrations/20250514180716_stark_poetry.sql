/*
  # Agregar esquema para proveedores y gastos

  1. Nuevas Tablas
    - `providers` (proveedores)
      - `id` (uuid, primary key)
      - `name` (text, nombre del proveedor)
      - `tax_id` (text, CUIT)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `notes` (text)
      - `created_at` (timestamp)
      - `active` (boolean)

    - `expense_types` (tipos de gastos)
      - `id` (uuid, primary key)
      - `name` (text, nombre del tipo de gasto)
      - `description` (text)
      - `is_fixed` (boolean, si es un gasto fijo mensual)
      - `created_at` (timestamp)

    - `provider_condominiums` (relación proveedor-consorcio)
      - `provider_id` (uuid, foreign key)
      - `condominium_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Modificaciones
    - Agregar columnas a la tabla `expenses`
      - `provider_id` (uuid, foreign key)
      - `expense_type_id` (uuid, foreign key)
      - `invoice_number` (text)
      - `invoice_date` (date)
      - `due_date` (date)

  3. Seguridad
    - Habilitar RLS en todas las tablas
    - Agregar políticas para autenticación
*/

-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text,
  address text,
  phone text,
  email text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Crear tabla de tipos de gastos
CREATE TABLE IF NOT EXISTS expense_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_fixed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Crear tabla de relación proveedor-consorcio
CREATE TABLE IF NOT EXISTS provider_condominiums (
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  condominium_id uuid REFERENCES condominiums(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (provider_id, condominium_id)
);

-- Modificar tabla de gastos
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES providers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS expense_type_id uuid REFERENCES expense_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS invoice_date date,
ADD COLUMN IF NOT EXISTS due_date date;

-- Habilitar RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_condominiums ENABLE ROW LEVEL SECURITY;

-- Políticas para providers
CREATE POLICY "Users can view their own providers"
  ON providers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own providers"
  ON providers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
  ON providers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
  ON providers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para expense_types
CREATE POLICY "Users can view their own expense types"
  ON expense_types
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense types"
  ON expense_types
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense types"
  ON expense_types
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense types"
  ON expense_types
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para provider_condominiums
CREATE POLICY "Users can view provider_condominiums for their condominiums"
  ON provider_condominiums
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE condominiums.id = provider_condominiums.condominium_id
      AND condominiums.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert provider_condominiums for their condominiums"
  ON provider_condominiums
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE condominiums.id = provider_condominiums.condominium_id
      AND condominiums.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete provider_condominiums for their condominiums"
  ON provider_condominiums
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE condominiums.id = provider_condominiums.condominium_id
      AND condominiums.user_id = auth.uid()
    )
  );