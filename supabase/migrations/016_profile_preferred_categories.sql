-- ============================================================
-- BiblioTech - Preferences de categories a l'inscription
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_categories
  ON public.profiles USING gin (preferred_categories);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    preferred_categories
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(NEW.raw_user_meta_data -> 'preferred_categories') = 'array'
              THEN NEW.raw_user_meta_data -> 'preferred_categories'
            ELSE '[]'::jsonb
          END
        )
      ),
      '{}'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    preferred_categories = CASE
      WHEN cardinality(EXCLUDED.preferred_categories) > 0 THEN EXCLUDED.preferred_categories
      ELSE public.profiles.preferred_categories
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
