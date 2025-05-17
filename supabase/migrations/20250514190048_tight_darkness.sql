/*
  # Fix Providers Form Migration

  1. Changes
    - Simplify RLS policies for providers table
    - Add proper indexes for performance
    - Ensure proper constraints and relationships

  2. Security
    - Enable RLS on both tables
    - Create policies for all CRUD operations
    - Ensure proper access control
*/

-- First, enable RLS on both tables
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_condominiums ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;
DROP POLICY IF EXISTS "Users can view providers" ON providers;

DROP POLICY IF EXISTS "Users can view provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can insert provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can delete provider_condominiums" ON provider_condominiums;

-- Create base provider policies
CREATE POLICY "Users can insert their own providers"
  ON providers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
  ON providers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
  ON providers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a simplified SELECT policy for providers
CREATE POLICY "Users can view providers"
  ON providers FOR SELECT
  TO authenticated
  USING (
    -- User owns the provider directly
    auth.uid() = user_id
    OR
    -- User manages a condominium that has this provider
    EXISTS (
      SELECT 1
      FROM condominiums c
      JOIN provider_condominiums pc ON pc.condominium_id = c.id
      WHERE pc.provider_id = providers.id
      AND c.user_id = auth.uid()
    )
  );

-- Create provider_condominiums policies
CREATE POLICY "Users can view provider_condominiums"
  ON provider_condominiums FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM condominiums
      WHERE id = provider_condominiums.condominium_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert provider_condominiums"
  ON provider_condominiums FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM condominiums
      WHERE id = provider_condominiums.condominium_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete provider_condominiums"
  ON provider_condominiums FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM condominiums
      WHERE id = provider_condominiums.condominium_id
      AND user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_provider_condominiums_composite ON provider_condominiums(provider_id, condominium_id);