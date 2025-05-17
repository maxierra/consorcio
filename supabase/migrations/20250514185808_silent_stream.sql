/*
  # Fix provider policies to avoid recursion

  1. Changes
    - Drop all existing policies to start fresh
    - Create new non-recursive policies for providers and provider_condominiums tables
    - Simplify policy conditions to avoid circular dependencies
    
  2. Security
    - Maintain RLS on both tables
    - Ensure proper access control for both direct ownership and condominium association
*/

-- First, enable RLS on both tables if not already enabled
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

-- Create a simplified SELECT policy for providers that avoids recursion
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
    -- User manages the condominium
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
    -- User manages the condominium
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
    -- User manages the condominium
    EXISTS (
      SELECT 1
      FROM condominiums
      WHERE id = provider_condominiums.condominium_id
      AND user_id = auth.uid()
    )
  );