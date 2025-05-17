-- Create interest_config table
CREATE TABLE interest_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  first_period_days INTEGER NOT NULL DEFAULT 15,
  first_period_rate DECIMAL(5,4) NOT NULL DEFAULT 0.05,
  second_period_rate DECIMAL(5,4) NOT NULL DEFAULT 0.10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(condominium_id)
);

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
