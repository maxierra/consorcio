/*
  # Simplify Providers Table Policies

  1. Changes
    - Remove provider_condominiums relationship
    - Simplify RLS policies for providers table
    - Add performance indexes

  2. Security
    - Enable RLS on providers table
    - Add policies for CRUD operations
    - Users can only access their own providers
*/

-- Enable RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own providers" ON providers;
DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;
DROP POLICY IF EXISTS "Users can view providers" ON providers;

-- Create simplified policies
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
  USING (auth.uid() = user_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);