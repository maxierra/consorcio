/*
  # Add provider invoices table

  1. New Tables
    - `provider_invoices`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references providers)
      - `condominium_id` (uuid, references condominiums)
      - `invoice_number` (text)
      - `invoice_date` (date)
      - `due_date` (date)
      - `amount` (numeric)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `receipt_url` (text, nullable)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create provider_invoices table
CREATE TABLE IF NOT EXISTS provider_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE,
  condominium_id uuid REFERENCES condominiums(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  receipt_url text,
  CONSTRAINT provider_invoices_invoice_number_provider_id_key UNIQUE (invoice_number, provider_id)
);

-- Enable RLS
ALTER TABLE provider_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view provider invoices"
  ON provider_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE id = provider_invoices.condominium_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert provider invoices"
  ON provider_invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE id = provider_invoices.condominium_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update provider invoices"
  ON provider_invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE id = provider_invoices.condominium_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete provider invoices"
  ON provider_invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM condominiums
      WHERE id = provider_invoices.condominium_id
      AND user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_provider_invoices_provider_id ON provider_invoices(provider_id);
CREATE INDEX idx_provider_invoices_condominium_id ON provider_invoices(condominium_id);
CREATE INDEX idx_provider_invoices_invoice_date ON provider_invoices(invoice_date);
CREATE INDEX idx_provider_invoices_status ON provider_invoices(status);