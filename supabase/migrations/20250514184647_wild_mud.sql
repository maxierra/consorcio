/*
  # Fix Provider Policies

  1. Changes
    - Simplify provider policies to ensure proper access
    - Fix provider-condominium relationship policies
    - Add missing indexes for performance

  2. Security
    - Users can view their own providers and providers associated with their condominiums
    - Users can only create/update/delete their own providers
    - Users can associate providers with condominiums they own
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view providers for their condominiums" ON providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;

-- Create simplified provider policies
CREATE POLICY "Users can view their own providers"
ON providers FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own providers"
ON providers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
ON providers FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
ON providers FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Update provider_condominiums policies
DROP POLICY IF EXISTS "Users can insert provider_condominiums for their condominiums" ON provider_condominiums;

CREATE POLICY "Users can insert provider_condominiums for their condominiums"
ON provider_condominiums FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM condominiums
    WHERE id = provider_condominiums.condominium_id
    AND user_id = auth.uid()
  )
);

-- Add performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_condominiums_provider_id ON provider_condominiums(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_condominiums_condominium_id ON provider_condominiums(condominium_id);