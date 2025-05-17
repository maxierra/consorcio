/*
  # Fix Provider RLS Policies

  1. Changes
    - Adds proper RLS policies for providers table
    - Ensures users can insert their own providers
    - Maintains data isolation between users

  2. Security
    - Enable RLS on providers table
    - Add policies for CRUD operations
    - Ensure user_id is properly checked
*/

-- First, ensure RLS is enabled
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own providers" ON providers;
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;

-- Create new policies
CREATE POLICY "Users can view their own providers"
  ON providers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Add policies for provider_condominiums table
DROP POLICY IF EXISTS "Users can view provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can insert provider_condominiums" ON provider_condominiums;
DROP POLICY IF EXISTS "Users can delete provider_condominiums" ON provider_condominiums;

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
  );

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
  );