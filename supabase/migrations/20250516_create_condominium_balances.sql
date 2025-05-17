-- Tabla para almacenar los balances de consorcios
CREATE TABLE IF NOT EXISTS condominium_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  initial_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  income DECIMAL(12, 2) NOT NULL DEFAULT 0,
  expenses DECIMAL(12, 2) NOT NULL DEFAULT 0,
  final_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'closed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(condominium_id, period_month, period_year)
);

-- Tabla para almacenar los movimientos detallados de cada balance
CREATE TABLE IF NOT EXISTS condominium_balance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balance_id UUID NOT NULL REFERENCES condominium_balances(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'income', 'expense'
  category VARCHAR(50) NOT NULL, -- 'fee_payment', 'provider_payment', 'employee_payment', 'other'
  reference_id UUID, -- ID de referencia (puede ser un pago de expensa, factura, etc.)
  reference_type VARCHAR(50), -- Tipo de referencia ('fee_payment', 'provider_invoice', 'employee_payment')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_condominium_balances_condominium_id ON condominium_balances(condominium_id);
CREATE INDEX IF NOT EXISTS idx_condominium_balances_period ON condominium_balances(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_condominium_balance_transactions_balance_id ON condominium_balance_transactions(balance_id);
CREATE INDEX IF NOT EXISTS idx_condominium_balance_transactions_type ON condominium_balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_condominium_balance_transactions_category ON condominium_balance_transactions(category);

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_condominium_balances_updated_at
BEFORE UPDATE ON condominium_balances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular el balance final automáticamente
CREATE OR REPLACE FUNCTION calculate_final_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.final_balance = NEW.initial_balance + NEW.income - NEW.expenses;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_condominium_balances_final_balance
BEFORE INSERT OR UPDATE OF initial_balance, income, expenses ON condominium_balances
FOR EACH ROW
EXECUTE FUNCTION calculate_final_balance();
