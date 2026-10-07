-- LGPD (art. 8º e 11): registro do consentimento para dados de saúde e para envio à IA.
-- Histórico APENAS DE INSERÇÃO: conceder e revogar geram linhas novas. O estado atual é a linha
-- mais recente de cada finalidade. O usuário lê e insere só as próprias linhas e não pode
-- editar nem apagar o histórico. As linhas somem junto com a conta (ON DELETE CASCADE).
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('health_data', 'ai_processing')),
  granted BOOLEAN NOT NULL,
  text_version TEXT NOT NULL CHECK (length(text_version) BETWEEN 1 AND 40),
  source TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'settings', 'backfill')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_consents_user_purpose_idx
  ON public.user_consents (user_id, purpose, created_at DESC);

REVOKE ALL ON public.user_consents FROM anon;
GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consents" ON public.user_consents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users record own consents" ON public.user_consents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Sem policy de UPDATE/DELETE: o histórico não pode ser reescrito pelo cliente.

-- Para chamadas do app (JWT do usuário), a data é sempre a do servidor e a origem não pode ser
-- 'backfill': o cliente não consegue antedatar um consentimento. SQL do painel e migrations
-- (sem JWT) podem preservar a data original, usada no backfill abaixo.
CREATE OR REPLACE FUNCTION public.user_consents_server_time()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
BEGIN
  IF jwt_role IN ('authenticated', 'anon') THEN
    NEW.created_at := now();
    IF NEW.source = 'backfill' THEN NEW.source := 'app'; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS user_consents_server_time_trg ON public.user_consents;
CREATE TRIGGER user_consents_server_time_trg
BEFORE INSERT ON public.user_consents
FOR EACH ROW EXECUTE FUNCTION public.user_consents_server_time();

-- Backfill: traz para a tabela os consentimentos registrados pelo app no user_metadata
-- (auth.users.raw_user_meta_data->'consents') antes desta migration existir.
INSERT INTO public.user_consents (user_id, purpose, granted, text_version, source, created_at)
SELECT u.id, c.key, (c.value->>'granted')::boolean, left(coalesce(c.value->>'version', 'desconhecida'), 40), 'backfill',
       CASE WHEN (c.value->>'at') ~ '^\d{4}-\d{2}-\d{2}T' THEN (c.value->>'at')::timestamptz ELSE now() END
FROM auth.users u
CROSS JOIN LATERAL jsonb_each(coalesce(u.raw_user_meta_data->'consents', '{}'::jsonb)) AS c(key, value)
WHERE c.key IN ('health_data', 'ai_processing')
  AND jsonb_typeof(c.value->'granted') = 'boolean';
-- Idempotente o suficiente para rodar uma vez; se rodar de novo, duplica as linhas de backfill
-- (inofensivo: o estado atual continua sendo a linha mais recente).

-- Rollback (apaga o histórico de consentimentos; o user_metadata continua com o estado atual):
--   DROP TABLE IF EXISTS public.user_consents;
--   DROP FUNCTION IF EXISTS public.user_consents_server_time();
