-- Auditoria de segurança (B10): a FK weight_log_id não passa por RLS, então uma foto poderia
-- apontar para o weight_log de outra conta. Este trigger exige o mesmo dono.
-- SECURITY INVOKER de propósito: com o JWT do usuário, a RLS de weight_log já esconde logs alheios.
CREATE OR REPLACE FUNCTION public.validate_progress_photo_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.weight_log_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.weight_log w WHERE w.id = NEW.weight_log_id AND w.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Registro de evolução inválido';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_progress_photo_owner_trg ON public.progress_photos;
CREATE TRIGGER validate_progress_photo_owner_trg
BEFORE INSERT OR UPDATE ON public.progress_photos
FOR EACH ROW EXECUTE FUNCTION public.validate_progress_photo_owner();

-- Rollback:
--   DROP TRIGGER IF EXISTS validate_progress_photo_owner_trg ON public.progress_photos;
--   DROP FUNCTION IF EXISTS public.validate_progress_photo_owner();
