import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export type FoodEntry = {
  id: string;
  food_name: string;
  quantity: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  logged_at: string;
  created_at?: string;
};

export type Favorite = {
  id: string;
  food_name: string;
  emoji: string | null;
  category: string | null;
  portion_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium_mg: number | null;
};

export const MEAL_TYPES = [
  { id: "cafe", label: "Café da manhã", short: "Café", hour: 8 },
  { id: "almoco", label: "Almoço", short: "Almoço", hour: 12 },
  { id: "lanche", label: "Lanche", short: "Lanche", hour: 16 },
  { id: "jantar", label: "Jantar", short: "Jantar", hour: 20 },
  { id: "outro", label: "Outro", short: "Outro", hour: 22 },
] as const;

export const mealLabel = (id: string) =>
  MEAL_TYPES.find((m) => m.id === id)?.label ?? "Outro";

export const toISODate = (d: Date) => {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
};

export const todayISO = () => toISODate(new Date());

export const emptyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export const sumTotals = (rows: Pick<FoodEntry, "calories" | "protein" | "carbs" | "fat" | "fiber">[]) =>
  rows.reduce(
    (acc, e) => ({
      calories: acc.calories + Number(e.calories || 0),
      protein: acc.protein + Number(e.protein || 0),
      carbs: acc.carbs + Number(e.carbs || 0),
      fat: acc.fat + Number(e.fat || 0),
      fiber: acc.fiber + Number(e.fiber || 0),
    }),
    { ...emptyTotals }
  );

const stale = 30_000;

/** Alimentos de um dia específico */
export const useFoodLog = (date: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["foodLog", user?.id, date],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_log")
        .select("*")
        .eq("user_id", user!.id)
        .eq("logged_at", date)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FoodEntry[];
    },
  });
};

/** Alimentos num intervalo (calendário, resumo semanal, contexto da IA) */
export const useFoodLogRange = (from: string, to: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["foodLogRange", user?.id, from, to],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_log")
        .select("*")
        .eq("user_id", user!.id)
        .gte("logged_at", from)
        .lte("logged_at", to)
        .order("logged_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FoodEntry[];
    },
  });
};

export const useGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", user?.id],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_goals")
        .select("calories_goal, protein_goal, water_goal_ml, target_weight")
        .eq("user_id", user!.id)
        .maybeSingle();
      return {
        calories_goal: data?.calories_goal ?? 2000,
        protein_goal: data?.protein_goal ?? 100,
        water_goal_ml: data?.water_goal_ml ?? 2500,
        target_weight: data?.target_weight ?? null,
      };
    },
  });
};

export const useWater = (date: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["water", user?.id, date],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data } = await supabase
        .from("water_log")
        .select("amount_ml")
        .eq("user_id", user!.id)
        .eq("logged_at", date);
      return (data ?? []).reduce((s, r: { amount_ml: number }) => s + (r.amount_ml || 0), 0);
    },
  });
};

/** Água num intervalo (score, streak, insights) */
export const useWaterRange = (from: string, to: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["waterRange", user?.id, from, to],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data } = await supabase
        .from("water_log")
        .select("amount_ml, logged_at")
        .eq("user_id", user!.id)
        .gte("logged_at", from)
        .lte("logged_at", to);
      return (data ?? []) as { amount_ml: number; logged_at: string }[];
    },
  });
};

/** Contagem de fotos de evolução (conquistas) */
export const useProgressPhotoCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["photoCount", user?.id],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { count } = await supabase
        .from("progress_photos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
  });
};

export const usePreferences = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["prefs", user?.id],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("objective, restrictions, disliked_foods, liked_foods")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
};

export const useFavorites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data } = await supabase
        .from("food_favorites")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Favorite[];
    },
  });
};

export const useWeightLog = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weightLog", user?.id],
    enabled: !!user,
    staleTime: stale,
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_log")
        .select("weight_kg, waist_cm, logged_at")
        .eq("user_id", user!.id)
        .order("logged_at", { ascending: true });
      return data ?? [];
    },
  });
};

/**
 * Invalida os caches compartilhados entre módulos.
 * Chame após qualquer escrita (scanner, diário, água, evolução, perfil).
 */
export const useSyncModules = () => {
  const qc = useQueryClient();
  return useCallback(
    (
      scopes: ("food" | "water" | "goals" | "prefs" | "favorites" | "weight")[] = [
        "food",
        "water",
        "goals",
        "prefs",
        "favorites",
        "weight",
      ]
    ) => {
      const map: Record<string, string[]> = {
        food: ["foodLog", "foodLogRange"],
        water: ["water", "waterRange"],
        goals: ["goals"],
        prefs: ["prefs"],
        favorites: ["favorites"],
        weight: ["weightLog", "photoCount"],
      };
      scopes.flatMap((s) => map[s]).forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
    },
    [qc]
  );
};