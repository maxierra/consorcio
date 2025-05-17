-- Create the balance_transactions table
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balance_id UUID NOT NULL REFERENCES condominium_balances(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on balance_id for faster lookups
CREATE INDEX IF NOT EXISTS balance_transactions_balance_id_idx ON balance_transactions(balance_id);

-- Create an index on condominium_id for faster lookups
CREATE INDEX IF NOT EXISTS balance_transactions_condominium_id_idx ON balance_transactions(condominium_id);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON balance_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
