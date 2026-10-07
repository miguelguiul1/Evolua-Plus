CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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