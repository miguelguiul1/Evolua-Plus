import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export type MealKey = "cafe" | "almoco" | "lanche" | "jantar";

export type RoutineProfileData = {
  mealTimes: Record<MealKey, string>;
  usualMeals: Record<MealKey, string>;
  waterMl: string;
  trains: boolean;
  sports: string[];
  trainingFrequency: string;
  trainingPeriod: string;
  busyPeriods: string[];
  littleTimeToCook: boolean;
  notes: string;
};

type RoutineProfileRow = {
  breakfast_time: string | null;
  lunch_time: string | null;
  snack_time: string | null;
  dinner_time: string | null;
  breakfast_usual: string | null;
  lunch_usual: string | null;
  snack_usual: string | null;
  dinner_usual: string | null;
  water_ml: number | null;
  trains: boolean;
  sports: string[];
  training_frequency: string | null;
  training_period: string | null;
  busy_periods: string[];
  little_time_to_cook: boolean;
  routine_notes: string | null;
  completed: boolean;
};

type RoutineProfileInsert = Partial<RoutineProfileRow> & {
  user_id: string;
  completed_at?: string;
  updated_at: string;
};

type RoutineProfileClient = {
  from: (table: "user_routine_profile") => {
    select: (columns: string) => {
      eq: (column: "user_id", value: string) => {
        maybeSingle: () => Promise<{ data: RoutineProfileRow | null; error: Error | null }>;
      };
    };
    upsert: (
      values: RoutineProfileInsert,
      options: { onConflict: "user_id" }
    ) => Promise<{ error: Error | null }>;
  };
};

// This table is newer than the generated database types bundled with the client.
const routineProfileClient = supabase as unknown as RoutineProfileClient;

export const emptyRoutineProfile: RoutineProfileData = {
  mealTimes: { cafe: "", almoco: "", lanche: "", jantar: "" },
  usualMeals: { cafe: "", almoco: "", lanche: "", jantar: "" },
  waterMl: "",
  trains: false,
  sports: [],
  trainingFrequency: "",
  trainingPeriod: "",
  busyPeriods: [],
  littleTimeToCook: false,
  notes: "",
};

/** Perfil de rotina opcional — não confundir com o onboarding básico obrigatório. */
export const useRoutineProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["routineProfile", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await routineProfileClient
        .from("user_routine_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const value: RoutineProfileData = {
        mealTimes: {
          cafe: data.breakfast_time ?? "",
          almoco: data.lunch_time ?? "",
          lanche: data.snack_time ?? "",
          jantar: data.dinner_time ?? "",
        },
        usualMeals: {
          cafe: data.breakfast_usual ?? "",
          almoco: data.lunch_usual ?? "",
          lanche: data.snack_usual ?? "",
          jantar: data.dinner_usual ?? "",
        },
        waterMl: data.water_ml != null ? String(data.water_ml) : "",
        trains: !!data.trains,
        sports: data.sports ?? [],
        trainingFrequency: data.training_frequency ?? "",
        trainingPeriod: data.training_period ?? "",
        busyPeriods: data.busy_periods ?? [],
        littleTimeToCook: !!data.little_time_to_cook,
        notes: data.routine_notes ?? "",
      };
      return { value, completed: !!data.completed };
    },
  });
};

/** Salva (upsert) o perfil de rotina. Sempre associado ao usuário logado, nunca obrigatório. */
export const usePersistRoutineProfile = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useCallback(
    async (p: RoutineProfileData, complete: boolean) => {
      if (!user) throw new Error("Sessão expirada. Entre novamente para salvar.");

      const waterMl = p.waterMl.trim() ? Math.round(Number(p.waterMl.replace(",", "."))) : null;

      const { error } = await routineProfileClient.from("user_routine_profile").upsert(
        {
          user_id: user.id,
          breakfast_time: p.mealTimes.cafe || null,
          lunch_time: p.mealTimes.almoco || null,
          snack_time: p.mealTimes.lanche || null,
          dinner_time: p.mealTimes.jantar || null,
          breakfast_usual: p.usualMeals.cafe.trim() || null,
          lunch_usual: p.usualMeals.almoco.trim() || null,
          snack_usual: p.usualMeals.lanche.trim() || null,
          dinner_usual: p.usualMeals.jantar.trim() || null,
          water_ml: waterMl != null && Number.isFinite(waterMl) && waterMl > 0 ? waterMl : null,
          trains: p.trains,
          sports: p.trains ? p.sports : [],
          training_frequency: p.trains ? p.trainingFrequency.trim() || null : null,
          training_period: p.trains ? p.trainingPeriod.trim() || null : null,
          busy_periods: p.busyPeriods,
          little_time_to_cook: p.littleTimeToCook,
          routine_notes: p.notes.trim() || null,
          completed: complete,
          ...(complete ? { completed_at: new Date().toISOString() } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["routineProfile", user.id] });
    },
    [user, qc]
  );
};
