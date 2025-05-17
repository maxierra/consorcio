/*
  # Fix Providers RLS Policies

  1. Changes
    - Drop existing RLS policies for providers table
    - Create new RLS policies that correctly handle provider access:
      - Users can view providers they created
      - Users can view providers linked to their condominiums
  
  2. Security
    - Maintains RLS enabled on providers table
    - Ensures users can only access their own providers or providers linked to their condominiums
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view providers" ON providers;
DROP POLICY IF EXISTS "Users can view their own providers" ON providers;

-- Create new SELECT policy
CREATE POLICY "Users can view providers" ON providers
FOR SELECT TO authenticated
USING (
  -- User owns the provider directly
  user_id = auth.uid()
  OR 
  -- Provider is linked to user's condominiums through provider_condominiums
  EXISTS (
    SELECT 1 
    FROM provider_condominiums pc
    JOIN condominiums c ON c.id = pc.condominium_id
    WHERE pc.provider_id = providers.id 
    AND c.user_id = auth.uid()
  )
);