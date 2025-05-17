-- Add expense_categories column to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS expense_categories JSONB DEFAULT '[]'::jsonb;

-- Update existing units to have default expense categories based on their type
UPDATE units 
SET expense_categories = 
  CASE 
    WHEN type ILIKE '%departamento%' OR type = '4' THEN '["expensas_ordinarias_a", "expensas_ordinarias_b", "expensas_aysa"]'::jsonb
    ELSE '["expensas_ordinarias_a", "expensas_aysa"]'::jsonb
  END
WHERE expense_categories IS NULL OR expense_categories = '[]'::jsonb;
