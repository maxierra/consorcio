-- Agregar columnas payment_status y payment_date a la tabla employee_compensations
ALTER TABLE "public"."employee_compensations" 
ADD COLUMN IF NOT EXISTS "payment_status" TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "payment_date" TIMESTAMP WITH TIME ZONE;

-- Actualizar los registros existentes para establecer un valor predeterminado
UPDATE "public"."employee_compensations"
SET "payment_status" = 'pending'
WHERE "payment_status" IS NULL;

-- Agregar comentarios para documentar las columnas
COMMENT ON COLUMN "public"."employee_compensations"."payment_status" IS 'Estado de pago: pending o paid';
COMMENT ON COLUMN "public"."employee_compensations"."payment_date" IS 'Fecha en que se realizó el pago';
