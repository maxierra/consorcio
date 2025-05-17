-- Create administration table
CREATE TABLE IF NOT EXISTS public.administration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cuit TEXT NOT NULL,
  registration_number TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for administration table
ALTER TABLE public.administration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.administration
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.administration
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.administration
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.administration
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();
