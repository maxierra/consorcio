/*
  # Provider Access Control Update

  1. Changes
    - Updates provider policies to allow viewing providers through condominium associations
    - Ensures proper access control for provider_condominiums table
    - Fixes policy conflicts and improves security rules

  2. Security
    - Enables RLS on both tables
    - Adds comprehensive policies for CRUD operations
    - Ensures users can only access their own data or data they're associated with
*/

-- First, enable RLS on both tables
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_condominiums ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own providers" ON providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;
DROP POLICY IF EXISTS "Users can view their own providers" ON providers;
DROP POLICY IF EXISTS "Users can view providers" ON providers;

DROP POLICY IF EXISTS "Users can view provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can insert provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can delete provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can view provider_condominiums for their condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can insert provider_condominiums for their condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can delete provider_condominiums for their condominiums" ON provider_condominiums;

-- Create new provider policies
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

CREATE POLICY "Users can view providers"
  ON providers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM provider_condominiums pc
      JOIN condominiums c ON c.id = pc.condominium_id
      WHERE pc.provider_id = providers.id
      AND c.user_id = auth.uid()
    )
  );

-- Create new provider_condominiums policies
CREATE POLICY "Users can view provider_condominiums"
  ON provider_condominiums FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = provider_condominiums.provider_id
      AND providers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE condominiums.id = provider_condominiums.condominium_id
      AND condominiums.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert provider_condominiums"
  ON provider_condominiums FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE condominiums.id = provider_condominiums.condominium_id
      AND condominiums.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete provider_condominiums"
  ON provider_condominiums FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE condominiums.id = provider_condominiums.condominium_id
      AND condominiums.user_id = auth.uid()
    )
  );