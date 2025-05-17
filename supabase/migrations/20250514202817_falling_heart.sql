-- Update check constraint for payment_method to include debit option
ALTER TABLE provider_invoices
DROP CONSTRAINT IF EXISTS provider_invoices_payment_method_check;

ALTER TABLE provider_invoices
ADD CONSTRAINT provider_invoices_payment_method_check
CHECK (payment_method IN ('cash', 'transfer', 'online', 'debit'));