/*
  # Fix Providers Schema and Policies

  1. Changes
    - Add missing indexes
    - Update RLS policies for better security
    - Fix provider_condominiums relationship

  2. Security
    - Ensure proper RLS policies
    - Add necessary indexes for performance
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own providers" ON providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_provider_condominiums_provider_id ON provider_condominiums(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_condominiums_condominium_id ON provider_condominiums(condominium_id);

-- Recreate policies with better security
CREATE POLICY "Users can view providers for their condominiums"
ON providers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM provider_condominiums pc
    JOIN condominiums c ON c.id = pc.condominium_id
    WHERE pc.provider_id = providers.id
    AND c.user_id = auth.uid()
  )
  OR
  user_id = auth.uid()
);

CREATE POLICY "Users can insert their own providers"
ON providers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
ON providers FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
ON providers FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Ensure provider_condominiums has proper RLS
DROP POLICY IF EXISTS "Users can view provider_condominiums for their condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can insert provider_condominiums for their condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can delete provider_condominiums for their condominiums" ON provider_condominiums;

CREATE POLICY "Users can view provider_condominiums for their condominiums"
ON provider_condominiums FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = provider_condominiums.condominium_id
    AND condominiums.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert provider_condominiums for their condominiums"
ON provider_condominiums FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = provider_condominiums.condominium_id
    AND condominiums.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete provider_condominiums for their condominiums"
ON provider_condominiums FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = provider_condominiums.condominium_id
    AND condominiums.user_id = auth.uid()
  )
);