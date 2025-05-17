/*
  # Fix Provider Policies

  1. Changes
    - Updates provider RLS policies to fix permission issues
    - Adds missing policies for provider-condominium relationships
    - Ensures proper access control for provider management

  2. Security
    - Enables proper access control for provider creation
    - Allows users to view providers associated with their condominiums
    - Maintains data isolation between users
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view providers for their condominiums" ON providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;

-- Create new policies with proper security
CREATE POLICY "Users can view providers for their condominiums"
ON providers FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM provider_condominiums pc
    JOIN condominiums c ON c.id = pc.condominium_id
    WHERE pc.provider_id = providers.id
    AND c.user_id = auth.uid()
  )
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

-- Update provider_condominiums policies
DROP POLICY IF EXISTS "Users can insert provider_condominiums for their condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can delete provider_condominiums for their condominiums" ON provider_condominiums;

CREATE POLICY "Users can insert provider_condominiums for their condominiums"
ON provider_condominiums FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM condominiums c
    JOIN providers p ON true
    WHERE c.id = provider_condominiums.condominium_id
    AND p.id = provider_condominiums.provider_id
    AND (c.user_id = auth.uid() OR p.user_id = auth.uid())
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