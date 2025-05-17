/*
  # Fix providers RLS policies

  1. Changes
    - Drop existing SELECT policy for providers table
    - Create new SELECT policy with simplified conditions
    - Add index to improve query performance

  2. Security
    - Users can view providers they created
    - Users can view providers linked to their condominiums
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view providers" ON providers;

-- Create new SELECT policy with simplified conditions
CREATE POLICY "Users can view providers"
ON providers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 
    FROM provider_condominiums pc
    JOIN condominiums c ON c.id = pc.condominium_id
    WHERE 
      pc.provider_id = providers.id AND 
      c.user_id = auth.uid()
  )
);

-- Add index to improve join performance
CREATE INDEX IF NOT EXISTS idx_provider_condominiums_composite 
ON provider_condominiums (provider_id, condominium_id);