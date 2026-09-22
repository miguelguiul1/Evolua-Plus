import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export type MemoryCategory = "preferencia" | "restricao" | "objetivo" | "habito" | "outro";

export type AiMemory = {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  source: string;
  active: boolean;
  created_at: string;
};

export const MEMORY_CATEGORIES: { id: MemoryCategory; label: string; emoji: string; hint: string }[] = [
  { id: "preferencia", label: "Preferências", emoji: "💚", hint: "Ex.: prefiro refeições rápidas" },
  { id: "restricao", label: "Restrições", emoji: "🚫", hint: "Ex.: tenho restrição a lactose" },
  { id: "objetivo", label: "Objetivos", emoji: "🎯", hint: "Ex.: quero ganhar massa magra" },
  { id: "habito", label: "Hábitos", emoji: "🔁", hint: "Ex.: cozinho na air fryer" },
  { id: "outro", label: "Outras informações", emoji: "📝", hint: "Qualquer detalhe útil" },
];

export const memoryCategoryLabel = (id: string) =>
  MEMORY_CATEGORIES.find((c) => c.id === id)?.label ?? "Outras informações";

export const useAiMemory = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai_memory", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_memory")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AiMemory[];
    },
  });
};

export const useAiMemoryMutations = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ai_memory", user?.id] });

  const add = useMutation({
    mutationFn: async (input: { content: string; category: MemoryCategory; source?: string }) => {
      const { error } = await supabase.from("ai_memory").insert({
        user_id: user!.id,
        content: input.content.trim(),
        category: input.category,
        source: input.source ?? "usuario",
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; content?: string; category?: MemoryCategory; active?: boolean }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("ai_memory").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const forget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_memory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, update, forget };
};

/** Frases curtas usadas como contexto da IA. */
export const memoryToPrompt = (rows: AiMemory[] | undefined) =>
  (rows ?? [])
    .filter((m) => m.active)
    .slice(0, 40)
    .map((m) => `${memoryCategoryLabel(m.category)}: ${m.content}`);