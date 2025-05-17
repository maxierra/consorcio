/*
  # Add Employees and Employee Payments Tables

  1. New Tables
    - `employees`: Stores employee information
      - `id` (uuid, primary key)
      - `name` (text)
      - `tax_id` (text)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `position` (text)
      - `active` (boolean)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
    
    - `employee_payments`: Stores monthly payments for employees
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references employees)
      - `condominium_id` (uuid, references condominiums)
      - `month` (integer)
      - `year` (integer)
      - `base_salary` (numeric)
      - `social_security` (numeric)
      - `union_fee` (numeric)
      - `additional_hours` (numeric)
      - `bonuses` (numeric)
      - `deductions` (numeric)
      - `total_amount` (numeric)
      - `payment_date` (date)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text,
  address text,
  phone text,
  email text,
  position text NOT NULL,
  active boolean DEFAULT true,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create employee_payments table
CREATE TABLE IF NOT EXISTS employee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  condominium_id uuid REFERENCES condominiums(id) ON DELETE CASCADE NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year >= 2000),
  base_salary numeric(10,2) NOT NULL,
  social_security numeric(10,2) NOT NULL DEFAULT 0,
  union_fee numeric(10,2) NOT NULL DEFAULT 0,
  additional_hours numeric(10,2) NOT NULL DEFAULT 0,
  bonuses numeric(10,2) NOT NULL DEFAULT 0,
  deductions numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  payment_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_name ON employees(name);
CREATE INDEX idx_employee_payments_employee_id ON employee_payments(employee_id);
CREATE INDEX idx_employee_payments_condominium_id ON employee_payments(condominium_id);
CREATE INDEX idx_employee_payments_period ON employee_payments(year, month);
CREATE INDEX idx_employee_payments_status ON employee_payments(status);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for employees
CREATE POLICY "Users can view their own employees"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own employees"
  ON employees FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for employee_payments
CREATE POLICY "Users can view employee payments"
  ON employee_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_payments.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employee payments"
  ON employee_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_payments.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update employee payments"
  ON employee_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_payments.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employee payments"
  ON employee_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_payments.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Create employee_condominiums table for many-to-many relationship
CREATE TABLE IF NOT EXISTS employee_condominiums (
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  condominium_id uuid REFERENCES condominiums(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (employee_id, condominium_id)
);

-- Enable RLS on employee_condominiums
ALTER TABLE employee_condominiums ENABLE ROW LEVEL SECURITY;

-- Create policies for employee_condominiums
CREATE POLICY "Users can view employee_condominiums"
  ON employee_condominiums FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_condominiums.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employee_condominiums"
  ON employee_condominiums FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_condominiums.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employee_condominiums"
  ON employee_condominiums FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_condominiums.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Create indexes for employee_condominiums
CREATE INDEX idx_employee_condominiums_employee_id 
  ON employee_condominiums(employee_id);

CREATE INDEX idx_employee_condominiums_condominium_id 
  ON employee_condominiums(condominium_id);

CREATE INDEX idx_employee_condominiums_composite 
  ON employee_condominiums(employee_id, condominium_id);