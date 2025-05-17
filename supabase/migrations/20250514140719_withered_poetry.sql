/*
  # Initial schema for condominium management system

  1. New Tables
    - `profiles`
      - Contains user profile data (connected to auth.users)
    - `condominiums`
      - Contains condominium information
    - `units`
      - Contains functional units within condominiums
    - `expenses`
      - Records expenses for condominiums
    - `fees`
      - Stores monthly fee calculations
    - `unit_fees`
      - Maps fees to units with payment status
    - `payments`
      - Records payments from unit owners

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create condominiums table
CREATE TABLE IF NOT EXISTS condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  tax_id TEXT,
  bank_info TEXT,
  active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  area NUMERIC(10, 2) NOT NULL,
  coefficient NUMERIC(10, 6) NOT NULL,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (condominium_id, number)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  receipt_url TEXT,
  is_extraordinary BOOLEAN DEFAULT false,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create fees table
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  generated_date DATE NOT NULL,
  pdf_url TEXT,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (condominium_id, month, year)
);

-- Create unit_fees table
CREATE TABLE IF NOT EXISTS unit_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id UUID REFERENCES fees(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (fee_id, unit_id)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  unit_fee_id UUID REFERENCES unit_fees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create security policies
-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Condominiums policies
CREATE POLICY "Users can view their own condominiums"
  ON condominiums
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own condominiums"
  ON condominiums
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own condominiums"
  ON condominiums
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own condominiums"
  ON condominiums
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Units policies
CREATE POLICY "Users can view units in their condominiums"
  ON units
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = units.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert units in their condominiums"
  ON units
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = units.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can update units in their condominiums"
  ON units
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = units.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete units in their condominiums"
  ON units
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = units.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

-- Expenses policies
CREATE POLICY "Users can view expenses for their condominiums"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = expenses.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert expenses for their condominiums"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = expenses.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can update expenses for their condominiums"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = expenses.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete expenses for their condominiums"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = expenses.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

-- Fees policies
CREATE POLICY "Users can view fees for their condominiums"
  ON fees
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = fees.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert fees for their condominiums"
  ON fees
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = fees.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can update fees for their condominiums"
  ON fees
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM condominiums
    WHERE condominiums.id = fees.condominium_id
    AND condominiums.user_id = auth.uid()
  ));

-- Unit fees policies
CREATE POLICY "Users can view unit fees related to their condominiums"
  ON unit_fees
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM fees
    JOIN condominiums ON fees.condominium_id = condominiums.id
    WHERE fees.id = unit_fees.fee_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert unit fees related to their condominiums"
  ON unit_fees
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM fees
    JOIN condominiums ON fees.condominium_id = condominiums.id
    WHERE fees.id = unit_fees.fee_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can update unit fees related to their condominiums"
  ON unit_fees
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM fees
    JOIN condominiums ON fees.condominium_id = condominiums.id
    WHERE fees.id = unit_fees.fee_id
    AND condominiums.user_id = auth.uid()
  ));

-- Payments policies
CREATE POLICY "Users can view payments related to their condominiums"
  ON payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM units
    JOIN condominiums ON units.condominium_id = condominiums.id
    WHERE units.id = payments.unit_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert payments related to their condominiums"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM units
    JOIN condominiums ON units.condominium_id = condominiums.id
    WHERE units.id = payments.unit_id
    AND condominiums.user_id = auth.uid()
  ));

CREATE POLICY "Users can update payments related to their condominiums"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM units
    JOIN condominiums ON units.condominium_id = condominiums.id
    WHERE units.id = payments.unit_id
    AND condominiums.user_id = auth.uid()
  ));

-- Create functions
-- Function to update unit_fees when a payment is made
CREATE OR REPLACE FUNCTION update_unit_fee_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unit_fee_id IS NOT NULL THEN
    UPDATE unit_fees
    SET is_paid = TRUE,
        payment_date = NOW()
    WHERE id = NEW.unit_fee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_unit_fee_on_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_unit_fee_on_payment();