-- Add regularization fields to expense_payments table
ALTER TABLE expense_payments
ADD COLUMN IF NOT EXISTS regularized BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS regularization_date TIMESTAMP WITH TIME ZONE;
