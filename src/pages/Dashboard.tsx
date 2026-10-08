import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { Button } from "@/components/ui/button";
import { MEAL_TYPES, todayISO, useFoodLog, useGoals, useWater } from "@/hooks/useNutrition";
import { useEngagement } from "@/hooks/useEngagement";
import { useAchievementToasts } from "@/hooks/useAchievementToasts";
import AiInsightCard from "@/components/dashboard/AiInsightCard";
import { PageSkeleton } from "@/components/ds/Skeletons";
import { loadStoredPlano } from "@/lib/planoStorage";

const Dashboard = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const today = todayISO();

  const { data: entries = [] } = useFoodLog(today);
  const { data: goals } = useGoals();
  const { data: waterMl = 0 } = useWater(today);
  const engagement = useEngagement();
  useAchievementToasts(engagement.achievements);

  // Plano persistido em Supabase (com fallback localStorage) define o CTA principal.
  const [hasPlan, setHasPlan] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    loadStoredPlano(user.id).then((p) => setHasPlan(!!p));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setName(data.full_name.split(" ")[0]); });
  }, [user]);

  const waterGoal = goals?.water_goal_ml ?? 2500;

  const nextMeal = useMemo(() => {
    const hour = new Date().getHours();
    const logged = new Set(entries.map((e) => e.meal_type));
    return (
      MEAL_TYPES.find((m) => m.id !== "outro" && m.hour >= hour && !logged.has(m.id)) ??
      MEAL_TYPES.find((m) => m.id !== "outro" && !logged.has(m.id)) ??
      null
    );
  }, [entries]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Contagens para a linha "Hoje" e a "Sua semana" — só leitura de dados que a página já recebe.
  const mealSlots = MEAL_TYPES.filter((m) => m.id !== "outro");
  const loggedMealIds = new Set(entries.map((e) => e.meal_type));
  const mealsDone = mealSlots.filter((m) => loggedMealIds.has(m.id)).length;
  const cups = Math.floor(waterMl / 250);
  const cupsGoal = Math.max(1, Math.round(waterGoal / 250));
  const weekDays = engagement.week;
  const daysLogged = weekDays.filter((d) => d.logged > 0).length;

  // "Agora": um único próximo passo, escolhido pelo estado que já existe.
  const agora = !hasPlan
    ? { titulo: "Monte o cardápio da semana.", apoio: "Usamos o que você já contou no perfil. Leva poucos minutos.", acao: "Montar cardápio", to: "/plano-semanal" }
    : nextMeal
      ? { titulo: `Anote o ${nextMeal.label.toLowerCase()}.`, apoio: `Por volta das ${nextMeal.hour}h. Do jeito que lembrar, sem precisar ser exato.`, acao: `Anotar ${nextMeal.short.toLowerCase()}`, to: "/diario" }
      : { titulo: "Dia anotado.", apoio: "Que tal dar uma olhada no cardápio de amanhã?", acao: "Ver cardápio", to: "/plano-semanal" };

  if (engagement.loading) return <PageSkeleton />;

  return (
    <div className="min-h-dvh pt-20 pb-10 md:pb-16">
      <div className="container mx-auto max-w-2xl">
        <header className="mb-5 anim-entrada">
          <h1 className="font-display text-[2rem] leading-tight font-semibold text-foreground">
            {greeting()}{name ? `, ${name}` : ""}.
          </h1>
        </header>

        {/* AGORA — o único destaque da tela */}
        <section aria-labelledby="agora" className="anim-entrada rounded-2xl border-2 border-foreground bg-card p-5 shadow-floating">
          <p id="agora" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Agora</p>
          <h2 className="mt-2 font-display text-2xl leading-snug font-semibold text-foreground">{agora.titulo}</h2>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{agora.apoio}</p>
          <Button asChild size="lg" className="press mt-5 w-full">
            <Link to={agora.to}>{agora.acao} <ArrowRight /></Link>
          </Button>
        </section>

        {/* HOJE — três sinais compactos, sem cards */}
        <section aria-labelledby="hoje" className="mt-8">
          <h2 id="hoje" className="font-display text-xl font-semibold text-foreground">Hoje</h2>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            <li>
              <Link to="/diario" className="flex items-center justify-between gap-3 py-3.5">
                <span className="text-[15px] text-foreground">Refeições anotadas</span>
                <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">{mealsDone} de {mealSlots.length}<ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
              </Link>
            </li>
            <li>
              <Link to="/diario" className="block py-3.5">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[15px] text-foreground">Água</span>
                  <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">{cups} de {cupsGoal} copos<ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
                </span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <span className="barra-progresso block h-full w-full rounded-full bg-foreground" style={{ transform: `scaleX(${Math.min(1, cups / cupsGoal)})` }} />
                </span>
              </Link>
            </li>
            <li>
              <Link to="/plano-semanal" className="flex items-center justify-between gap-3 py-3.5">
                <span className="text-[15px] text-foreground">Cardápio de hoje</span>
                <span className="flex items-center gap-2 text-[15px] font-semibold text-foreground">{hasPlan ? "Ver" : "Ainda não montado"}<ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
              </Link>
            </li>
          </ul>
        </section>

        {/* SUA SEMANA — dias com anotação; nada zera */}
        <section aria-labelledby="semana" className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 id="semana" className="font-display text-xl font-semibold text-foreground">Sua semana</h2>
            <Link to="/insights" className="tap-link text-sm font-semibold text-primary">Ver resumo</Link>
          </div>
          <p className="mt-1 text-[15px] text-muted-foreground">{daysLogged} de 7 dias com anotação.</p>
          <ol className="mt-4 grid grid-cols-7 gap-1.5">
            {weekDays.map((d) => {
              const ok = d.logged > 0;
              return (
                <li key={d.date} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${ok ? "border-foreground bg-foreground text-background" : "border-input text-transparent"}`}
                    aria-label={`${d.label}: ${ok ? "com anotação" : "sem anotação"}`}
                  >
                    {ok && <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">{d.label}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Dica da IA — segundo plano, só quando houver */}
        <div className="mt-8">
          <AiInsightCard />
        </div>

        {/* Atalhos */}
        <nav aria-label="Atalhos" className="mt-8">
          <ul className="divide-y divide-border border-y border-border">
            {[
              { to: "/receitas", label: "Receitas" },
              { to: "/plano-semanal", label: "Lista de compras" },
              { to: "/evolucao", label: "Evolução" },
              { to: "/preferencias", label: "Meu perfil" },
            ].map((s) => (
              <li key={s.label}>
                <Link to={s.to} className="flex items-center justify-between py-3.5 text-[15px] text-foreground">
                  {s.label}<ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;
