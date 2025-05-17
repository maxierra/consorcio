/*
  # Fix Employees RLS Policies

  1. Changes
    - Add proper RLS policies for employees table
    - Ensure user_id is properly checked for all operations
    - Maintain data isolation between users

  2. Security
    - Enable RLS on employees table
    - Add policies for CRUD operations
    - Ensure proper user authentication checks
*/

-- First, ensure RLS is enabled
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own employees" ON employees;
DROP POLICY IF EXISTS "Users can update their own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete their own employees" ON employees;
DROP POLICY IF EXISTS "Users can view their own employees" ON employees;

-- Create new policies
CREATE POLICY "Users can insert their own employees"
ON employees
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own employees"
ON employees
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own employees"
ON employees
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own employees"
ON employees
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);