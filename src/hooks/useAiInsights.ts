import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { useEngagement } from "@/hooks/useEngagement";
import { toast } from "sonner";

export type AiInsight = {
  key: string;
  message: string;
  category: string;
  route: string;
  detail: string;
};

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").slice(0, 60);

/** Insights derivados dos dados reais — nunca afirmam causalidade clínica. */
export const useAiInsights = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const e = useEngagement();

  const dismissedQ = useQuery({
    queryKey: ["ai_insights", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("insight_key, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).filter((r) => r.status === "ignorado").map((r) => r.insight_key));
    },
  });

  const candidates = useMemo<AiInsight[]>(() => {
    if (e.loading) return [];
    const out: AiInsight[] = [];
    const { averages, goals, streak, week, weightDelta, weights } = e;

    if (e.today.meals === 0)
      out.push({
        key: "sem-registro-hoje",
        message: "Você ainda não registrou refeições hoje.",
        category: "diario",
        route: "/diario",
        detail: "Registrar as refeições do dia deixa as sugestões da IA muito mais precisas. Comece pela última coisa que você comeu.",
      });

    if (averages.loggedDays >= 3 && averages.protein > 0 && averages.protein < goals.protGoal * 0.8)
      out.push({
        key: "proteina-abaixo",
        message: `Sua média de proteína na semana está em ${averages.protein}g (meta ${goals.protGoal}g).`,
        category: "macros",
        route: "/assistente",
        detail: "Nos dias registrados, a média de proteína ficou abaixo da sua meta. Posso sugerir trocas simples que aumentam a proteína sem mudar muito sua rotina.",
      });

    if (averages.water > 0 && averages.water < goals.waterGoal * 0.8)
      out.push({
        key: "hidratacao-baixa",
        message: `Sua média de hidratação está em ${(averages.water / 1000).toFixed(1)}L por dia.`,
        category: "agua",
        route: "/dashboard",
        detail: "Nos dias registrados sua média ficou abaixo da meta de água. Pequenos lembretes ao longo do dia costumam ajudar.",
      });

    if (averages.loggedDays >= 3 && averages.fiber > 0 && averages.fiber < 20)
      out.push({
        key: "fibras-baixas",
        message: `Sua média de fibras está em ${averages.fiber}g por dia.`,
        category: "macros",
        route: "/receitas",
        detail: "Frutas, leguminosas e vegetais aumentam as fibras com facilidade. Posso indicar receitas que se encaixam nas suas preferências.",
      });

    const loggedThis = week.filter((d) => d.logged > 0).length;
    if (loggedThis > 0 && loggedThis <= 3)
      out.push({
        key: "poucos-dias-registrados",
        message: `Você registrou ${loggedThis} dia(s) nos últimos 7.`,
        category: "consistencia",
        route: "/diario",
        detail: "Quanto mais dias registrados, melhor a leitura de padrões. Não precisa ser perfeito — registre o que der.",
      });

    if (streak.current >= 3)
      out.push({
        key: `sequencia-${streak.current}`,
        message: `Você está com ${streak.current} dias seguidos de registro.`,
        category: "conquista",
        route: "/insights",
        detail: "Constância é o que mais influencia a qualidade das análises. Continue no ritmo que você conseguir manter.",
      });

    if (weights.length >= 2 && Math.abs(weightDelta) >= 0.5)
      out.push({
        key: `tendencia-peso-${weightDelta.toFixed(1)}`,
        message: `Seu peso variou ${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}kg desde o primeiro registro.`,
        category: "evolucao",
        route: "/evolucao",
        detail: "Durante esse período você apresentou essa variação de peso enquanto também registrou seus hábitos alimentares. Tendências não indicam causa — para uma avaliação individual, procure um nutricionista ou médico.",
      });

    e.proactive.forEach((p) =>
      out.push({ key: slug(p), message: p, category: "geral", route: "/assistente", detail: p }),
    );

    return out;
  }, [e]);

  const dismissed = dismissedQ.data ?? new Set<string>();
  const visible = candidates.filter((c) => !dismissed.has(c.key));

  const dismiss = useMutation({
    mutationFn: async (insight: AiInsight) => {
      const { error } = await supabase.from("ai_insights").upsert(
        {
          user_id: user!.id,
          insight_key: insight.key,
          message: insight.message,
          category: insight.category,
          action_route: insight.route,
          status: "ignorado",
        },
        { onConflict: "user_id,insight_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_insights", user?.id] }),
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      toast.error("Não foi possível ignorar este insight agora.", { description: msg });
    },
  });

  return {
    loading: e.loading || dismissedQ.isLoading,
    insights: visible,
    current: visible[0] ?? null,
    dismiss,
  };
};