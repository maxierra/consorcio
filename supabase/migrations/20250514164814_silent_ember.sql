/*
  # Add bank account fields to condominiums table

  1. Changes
    - Add bank_name column for bank name
    - Add bank_account column for account number
    - Add bank_cbu column for CBU number

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE condominiums
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account text,
ADD COLUMN IF NOT EXISTS bank_cbu text;