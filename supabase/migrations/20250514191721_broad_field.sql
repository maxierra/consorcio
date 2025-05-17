/*
  # Add performance indexes for provider_condominiums table

  This migration adds composite and individual indexes to improve query performance
  on the provider_condominiums table.

  1. Changes
    - Add index on provider_id column
    - Add index on condominium_id column
    - Add composite index on (provider_id, condominium_id)
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_condominiums_provider_id 
  ON provider_condominiums(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_condominiums_condominium_id 
  ON provider_condominiums(condominium_id);

CREATE INDEX IF NOT EXISTS idx_provider_condominiums_composite 
  ON provider_condominiums(provider_id, condominium_id);