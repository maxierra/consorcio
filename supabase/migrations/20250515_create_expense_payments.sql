-- Create expense_payments table
CREATE TABLE expense_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  regularized BOOLEAN DEFAULT false NOT NULL,
  regularization_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(condominium_id, unit_id, month, year)
);
