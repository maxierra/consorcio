/*
  # Fix Provider RLS Policies

  1. Changes
    - Add proper RLS policies for providers table
    - Ensure user_id is properly checked for all operations
    - Fix provider-condominium relationship policies

  2. Security
    - Enable RLS on providers table
    - Add policies for CRUD operations
    - Ensure proper user authentication checks
*/

-- First, ensure RLS is enabled
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;
DROP POLICY IF EXISTS "Users can view their own providers" ON providers;

-- Create new policies
CREATE POLICY "Users can insert their own providers"
ON providers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
ON providers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
ON providers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own providers"
ON providers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ensure RLS is enabled on provider_condominiums table
ALTER TABLE provider_condominiums ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can delete provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can view provider_condominiums" ON provider_condominiums;

-- Create new policies for provider_condominiums
CREATE POLICY "Users can insert provider_condominiums"
ON provider_condominiums
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_condominiums.provider_id
    AND providers.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = provider_condominiums.condominium_id
    AND condominiums.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete provider_condominiums"
ON provider_condominiums
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM providers
    WHERE providers.id = provider_condominiums.provider_id
    AND providers.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = provider_condominiums.condominium_id
    AND condominiums.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view provider_condominiums"
ON provider_condominiums
FOR SELECT
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