-- Auditoria de segurança (M2): o usuário não pode se dar premium.
-- As policies de profiles permitem INSERT/UPDATE de todas as colunas da própria linha;
-- este trigger bloqueia is_premium para chamadas feitas com o JWT do usuário
-- (role "authenticated"). service_role (webhook de pagamento, painel) continua podendo alterar.
CREATE OR REPLACE FUNCTION public.protect_profiles_premium()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- nullif: fora de uma requisição da API (triggers de auth, SQL do painel) o valor pode ser ''.
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

-- Rollback:
--   DROP TRIGGER IF EXISTS protect_profiles_premium_trg ON public.profiles;
--   DROP FUNCTION IF EXISTS public.protect_profiles_premium();
