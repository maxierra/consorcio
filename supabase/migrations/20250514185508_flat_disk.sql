/*
  # Update provider RLS policies

  1. Changes
    - Drop existing SELECT policy for providers
    - Create new SELECT policy that allows users to view providers they own
      or providers associated with their condominiums
  
  2. Security
    - Maintains RLS protection
    - Uses auth.uid() instead of uid() function
    - Ensures users can only view providers they should have access to
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own providers" ON providers;

-- Create new SELECT policy that combines direct ownership and condominium association
CREATE POLICY "Users can view providers" ON providers
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id -- Direct ownership
    OR 
    EXISTS ( -- Associated through condominiums
      SELECT 1 
      FROM provider_condominiums pc
      JOIN condominiums c ON c.id = pc.condominium_id
      WHERE pc.provider_id = providers.id 
      AND c.user_id = auth.uid()
    )
  );