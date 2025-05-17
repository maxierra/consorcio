/*
  # Add period fields to provider invoices

  1. Changes
    - Add month and year columns to provider_invoices table
    - Add check constraints for valid month and year values
    - Add index for better query performance
*/

-- Add month and year columns
ALTER TABLE provider_invoices 
ADD COLUMN month integer,
ADD COLUMN year integer;

-- Update existing rows to use invoice_date values
UPDATE provider_invoices 
SET 
  month = EXTRACT(MONTH FROM invoice_date),
  year = EXTRACT(YEAR FROM invoice_date)
WHERE month IS NULL OR year IS NULL;

-- Make the columns required
ALTER TABLE provider_invoices 
ALTER COLUMN month SET NOT NULL,
ALTER COLUMN year SET NOT NULL;

-- Add check constraints
ALTER TABLE provider_invoices
ADD CONSTRAINT provider_invoices_month_check
CHECK (month BETWEEN 1 AND 12),
ADD CONSTRAINT provider_invoices_year_check
CHECK (year >= 2000);

-- Add composite index for better performance
CREATE INDEX idx_provider_invoices_period 
ON provider_invoices(year, month);