/*
  # Add period index to provider invoices

  1. Changes
    - Updates any NULL period values using invoice_date
    - Adds a composite index on year and month columns for better query performance

  2. Notes
    - Ensures all rows have valid period values
    - Improves performance of queries that filter by year and month
*/

-- Update any NULL values in existing rows
UPDATE provider_invoices 
SET 
  month = EXTRACT(MONTH FROM invoice_date),
  year = EXTRACT(YEAR FROM invoice_date)
WHERE month IS NULL OR year IS NULL;

-- Add composite index for better performance
CREATE INDEX IF NOT EXISTS idx_provider_invoices_period 
ON provider_invoices(year, month);