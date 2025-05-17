-- Agregar campo de estado de pago a la tabla expense_payments
ALTER TABLE expense_payments ADD COLUMN payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid', 'partial'));

-- Actualizar los registros existentes
-- Los que tienen amount = 0 se consideran 'unpaid'
UPDATE expense_payments SET payment_status = 'unpaid' WHERE amount = 0;

-- Los que tienen amount > 0 se consideran 'paid'
UPDATE expense_payments SET payment_status = 'paid' WHERE amount > 0;

-- Agregar un índice para mejorar el rendimiento de las consultas por estado
CREATE INDEX idx_expense_payments_status ON expense_payments(payment_status);

-- Comentario para documentar
COMMENT ON COLUMN expense_payments.payment_status IS 'Estado del pago: paid (pagado), unpaid (no pagado), partial (pago parcial)';
