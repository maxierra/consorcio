-- Create interest_config table if not exists
CREATE TABLE IF NOT EXISTS interest_config (
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
