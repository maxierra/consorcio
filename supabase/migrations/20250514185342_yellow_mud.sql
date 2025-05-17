/*
  # Fix providers RLS policies

  1. Security
    - Enable RLS on providers table if not already enabled
    - Create policies for CRUD operations if they don't exist
    - Each policy ensures users can only access their own providers
*/

DO $$ BEGIN
  -- Enable RLS
  ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create their own providers" ON providers;
  CREATE POLICY "Users can create their own providers"
    ON providers FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own providers" ON providers;
  CREATE POLICY "Users can view their own providers"
    ON providers FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update their own providers" ON providers;
  CREATE POLICY "Users can update their own providers"
    ON providers FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete their own providers" ON providers;
  CREATE POLICY "Users can delete their own providers"
    ON providers FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN others THEN NULL;
END $$;