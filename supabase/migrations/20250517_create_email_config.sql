-- Crear tabla para la configuración de correo electrónico
CREATE TABLE IF NOT EXISTS email_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service VARCHAR NOT NULL, -- 'gmail', 'outlook', 'smtp', etc.
  host VARCHAR,
  port INTEGER,
  secure BOOLEAN DEFAULT true,
  user_email VARCHAR NOT NULL,
  password VARCHAR NOT NULL,
  from_name VARCHAR,
  default_subject VARCHAR,
  default_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear políticas de seguridad
ALTER TABLE email_configuration ENABLE ROW LEVEL SECURITY;

-- Solo los administradores pueden ver y modificar la configuración de correo
CREATE POLICY "Admins can view email config" 
  ON email_configuration FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert email config" 
  ON email_configuration FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update email config" 
  ON email_configuration FOR UPDATE 
  USING (auth.role() = 'authenticated');
