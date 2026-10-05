CREATE OR REPLACE FUNCTION public.protect_profiles_premium()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
BEGIN
  IF jwt_role IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_premium := false;
    ELSIF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
      RAISE EXCEPTION 'is_premium só pode ser alterado pelo servidor';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_profiles_premium_trg ON public.profiles;
CREATE TRIGGER protect_profiles_premium_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_premium();