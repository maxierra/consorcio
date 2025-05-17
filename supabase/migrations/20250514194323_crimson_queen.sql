-- Add payment_method column to provider_invoices table
ALTER TABLE provider_invoices 
ADD COLUMN payment_method text;

-- Update existing rows to have a default value
UPDATE provider_invoices 
SET payment_method = 'transfer' 
WHERE payment_method IS NULL;

-- Make the column required for future inserts
ALTER TABLE provider_invoices 
ALTER COLUMN payment_method SET NOT NULL;

-- Add check constraint to validate payment method values
ALTER TABLE provider_invoices
ADD CONSTRAINT provider_invoices_payment_method_check
CHECK (payment_method IN ('cash', 'transfer', 'online'));

-- Add index for better query performance
CREATE INDEX idx_provider_invoices_payment_method 
ON provider_invoices(payment_method);