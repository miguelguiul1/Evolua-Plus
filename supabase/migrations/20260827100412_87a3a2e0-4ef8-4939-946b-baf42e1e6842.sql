-- Esta migration originalmente duplicava CREATE TABLE de global_favorites e meal_plans,
-- que já haviam sido criadas por 20260824120000 e 20260824120001.
-- Convertida em no-op em 2026-09-21 para não quebrar `supabase db push` em ambientes novos.
-- Nenhuma mudança de schema é necessária aqui — as tabelas já existem via as migrations anteriores.
SELECT 1;
