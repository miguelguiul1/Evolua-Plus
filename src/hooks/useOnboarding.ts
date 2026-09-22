import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import type { Objective } from "@/lib/objectives";
import { normalizeObjective } from "@/lib/objectives";
import type { Metrics } from "@/lib/nutritionCalc";

export type SetupProfile = {
  full_name: string | null;
  height_cm: number | null;
  age: number | null;
  sex: string | null;
  activity_level: string | null;
  sports: string[];
  onboarding_completed: boolean;
};

/** Estado de configuração do usuário — decide se o onboarding deve aparecer. */
export const useSetupStatus = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["setupStatus", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const [{ data: profile }, { data: prefs }, { data: weight }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, height_cm, age, sex, activity_level, sports, onboarding_completed")
          .eq("id", user!.id)
          .maybeSingle(),
        supabase
          .from("user_preferences")
          .select("objective, liked_foods, disliked_foods, restrictions")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("weight_log")
          .select("weight_kg, logged_at")
          .eq("user_id", user!.id)
          .order("logged_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const objective = normalizeObjective(prefs?.objective);
      return {
        profile: (profile ?? null) as SetupProfile | null,
        objective,
        prefs: prefs ?? null,
        lastWeight: weight?.weight_kg != null ? Number(weight.weight_kg) : null,
        /** usuários já configurados não são forçados ao onboarding */
        needsOnboarding: !(profile?.onboarding_completed || !!objective),
      };
    },
  });
};

export type PersistPayload = {
  objective: Objective;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "masculino" | "feminino" | "";
  activity: string;
  sports: string[];
  metrics: Metrics;
  liked: string[];
  disliked: string[];
  restrictions: string[];
  complete: boolean;
};

/** Salva perfil + metas + preferências de forma idempotente (nunca apaga o que já existe em silêncio). */
export const usePersistOnboarding = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useCallback(
    async (p: PersistPayload) => {
      if (!user) throw new Error("Sessão expirada. Entre novamente para salvar.");

      const profileFields = {
        height_cm: p.heightCm,
        age: p.age,
        sex: p.sex ? p.sex : null,
        activity_level: p.activity || null,
        sports: p.sports,
        ...(p.complete
          ? { onboarding_completed: true, onboarding_completed_at: new Date().toISOString() }
          : {}),
        updated_at: new Date().toISOString(),
      };

      // Tenta UPDATE primeiro. Se a linha não existe (trigger de signup falhou), faz INSERT.
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update(profileFields)
        .eq("id", user.id)
        .select("id");
      if (updateError) throw updateError;

      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id, ...profileFields });
        if (insertError) throw insertError;
      }

      const { error: goalsError } = await supabase.from("user_goals").upsert(
        {
          user_id: user.id,
          calories_goal: Math.min(10000, Math.max(500, p.metrics.calories)),
          protein_goal: Math.min(500, Math.max(10, p.metrics.protein)),
          carbs_goal: p.metrics.carbs,
          fat_goal: p.metrics.fat,
          bmr: p.metrics.bmr,
          tdee: p.metrics.tdee,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (goalsError) throw goalsError;

      const { error: prefsError } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          objective: p.objective,
          liked_foods: p.liked,
          disliked_foods: p.disliked,
          restrictions: p.restrictions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (prefsError) throw prefsError;

      // Registra o peso informado apenas se ainda não houver registro hoje.
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data: todayWeight } = await supabase
        .from("weight_log")
        .select("id")
        .eq("user_id", user.id)
        .gte("logged_at", since.toISOString())
        .limit(1)
        .maybeSingle();
      if (!todayWeight) {
        await supabase.from("weight_log").insert({
          user_id: user.id,
          weight_kg: p.weightKg,
          height_cm: p.heightCm,
        });
      }

      ["setupStatus", "goals", "prefs", "weightLog"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key] })
      );
    },
    [user, qc]
  );
};
