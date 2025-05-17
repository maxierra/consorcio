-- Create expense_periods table
CREATE TABLE expense_periods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  expenses JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(condominium_id, month, year)
);

-- Create index for faster queries
CREATE INDEX expense_periods_condominium_id_idx ON expense_periods(condominium_id);

-- Add RLS policies
ALTER TABLE expense_periods ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can CRUD expense_periods"
  ON expense_periods
  FOR ALL
  TO authenticated
  USING (true);
