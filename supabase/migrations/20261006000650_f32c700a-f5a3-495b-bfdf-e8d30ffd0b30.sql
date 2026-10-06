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