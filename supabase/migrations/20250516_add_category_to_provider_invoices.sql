-- Añadir columna de categoría a la tabla provider_invoices
ALTER TABLE provider_invoices ADD COLUMN category TEXT;

-- Comentario para la columna
COMMENT ON COLUMN provider_invoices.category IS 'Categoría de la factura (Expensas Ordinarias A, Expensas Ordinarias B, Expensas Aysa, etc.)';
