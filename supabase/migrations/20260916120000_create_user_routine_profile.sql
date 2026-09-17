-- Perfil de rotina opcional para personalização avançada do plano alimentar.
-- Preenchido sob demanda (fluxo "Plano personalizado"), nunca obrigatório e
-- nunca bloqueia o onboarding básico nem a geração padrão do plano semanal.
CREATE TABLE public.user_routine_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  breakfast_time TEXT,
  lunch_time TEXT,
  snack_time TEXT,
  dinner_time TEXT,
  breakfast_usual TEXT,
  lunch_usual TEXT,
  snack_usual TEXT,
  dinner_usual TEXT,
  water_ml INTEGER,
  trains BOOLEAN NOT NULL DEFAULT false,
  sports TEXT[] NOT NULL DEFAULT '{}',
  training_frequency TEXT,
  training_period TEXT,
  busy_periods TEXT[] NOT NULL DEFAULT '{}',
  little_time_to_cook BOOLEAN NOT NULL DEFAULT false,
  routine_notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_routine_profile TO authenticated;
GRANT ALL ON public.user_routine_profile TO service_role;

ALTER TABLE public.user_routine_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routine profile"
  ON public.user_routine_profile FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_routine_profile_updated_at
  BEFORE UPDATE ON public.user_routine_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
