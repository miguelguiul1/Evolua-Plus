import { Link } from "react-router-dom";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Sparkles, TrendingUp, Droplets, Utensils, Trophy, CalendarDays } from "lucide-react";
import ScoreCard from "@/components/engajamento/ScoreCard";
import StreakCard from "@/components/engajamento/StreakCard";
import AchievementsGrid from "@/components/engajamento/AchievementsGrid";
import { useEngagement } from "@/hooks/useEngagement";
import { useAchievementToasts } from "@/hooks/useAchievementToasts";

const fmtDay = (d: string) =>
  new Date(`${d}T12:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const StatCard = ({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) => (
  <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-4">
    <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
      <Icon className="w-4 h-4" />
    </span>
    <p className="font-display text-xl font-bold text-foreground">{value}</p>
    <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const Panel = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-5">
    <h2 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" /> {title}
    </h2>
    {children}
  </div>
);

const chartTooltip = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    fontSize: 12,
  },
};

const Insights = () => {
  const e = useEngagement();
  useAchievementToasts(e.achievements);

  const weightData = e.weights.map((w) => ({
    date: fmtDay(String(w.logged_at).slice(0, 10)),
    peso: Number(w.weight_kg),
    cintura: w.waist_cm ? Number(w.waist_cm) : null,
  }));

  const unlocked = e.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-dvh bg-background pt-20 pb-10 md:pb-16">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Sparkles className="w-3 h-3" /> Central de insights
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3">
            Seus <span className="text-primary">insights</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Tudo que seus registros revelam sobre a sua evolução — sempre para te ajudar a seguir em frente.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <ScoreCard score={e.today.score} message={e.today.message} breakdown={e.today.breakdown} />
          <div className="space-y-4">
            <StreakCard current={e.streak.current} best={e.streak.best} />
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={Trophy} label="Conquistas" value={`${unlocked}/${e.achievements.length}`} hint="desbloqueadas" />
              <StatCard icon={CalendarDays} label="Dias registrados" value={`${e.averages.loggedDays}/7`} hint="nesta semana" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <StatCard icon={TrendingUp} label="Média de calorias" value={`${e.averages.calories}`} hint={`meta ${e.goals.calGoal} kcal`} />
          <StatCard icon={Utensils} label="Média de proteína" value={`${e.averages.protein}g`} hint={`meta ${e.goals.protGoal}g`} />
          <StatCard icon={Droplets} label="Média de água" value={`${(e.averages.water / 1000).toFixed(1)}L`} hint={`meta ${(e.goals.waterGoal / 1000).toFixed(1)}L`} />
          <StatCard icon={Sparkles} label="Score médio" value={`${e.averages.score}`} hint="últimos 7 dias" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Calorias e proteínas na semana" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={e.week}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="calories" name="kcal" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="protein" name="proteína (g)" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Score diário" icon={Sparkles}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={e.week}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="score" name="score" stroke="hsl(var(--primary))" fill="url(#scoreFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Hidratação na semana" icon={Droplets}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={e.week}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="water" name="ml" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Evolução corporal" icon={TrendingUp}>
            {weightData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip {...chartTooltip} />
                  <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="cintura" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Registre ao menos dois pesos em <Link to="/evolucao" className="text-primary hover:underline">Evolução</Link> para ver seu gráfico.
              </p>
            )}
          </Panel>

          <Panel title="Alimentos mais consumidos" icon={Utensils}>
            {e.topFoods.length ? (
              <ul className="space-y-2">
                {e.topFoods.map(([nome, n]) => (
                  <li key={nome} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{nome}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-3">{n}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Assim que você registrar refeições, seus alimentos favoritos aparecem aqui.</p>
            )}
          </Panel>

          <Panel title="Suas refeições" icon={CalendarDays}>
            <div className="space-y-2 mb-4">
              {e.mealCount.map((m) => {
                const max = Math.max(...e.mealCount.map((x) => x.count), 1);
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{m.label}</span>
                    <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(m.count / max) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-8 text-right">{m.count}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {e.mostLoggedMeal?.count
                ? `Você é mais consistente no ${e.mostLoggedMeal.label.toLowerCase()}.`
                : "Registre refeições para descobrir seus padrões."}
              {e.forgottenMeal?.count === 0 && ` O ${e.forgottenMeal.label.toLowerCase()} é uma boa oportunidade de começar.`}
            </p>
          </Panel>
        </div>

        {(e.bestDays.length > 0 || e.missingDays.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Panel title="Melhores dias" icon={Trophy}>
              {e.bestDays.length ? (
                <ul className="space-y-2 text-sm">
                  {e.bestDays.map((d) => (
                    <li key={d.date} className="flex items-center justify-between">
                      <span className="text-foreground">{fmtDay(d.date)}</span>
                      <span className="text-xs font-semibold text-primary">score {d.score}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Seus melhores dias aparecem aqui após alguns registros.</p>
              )}
            </Panel>
            <Panel title="Dias para retomar" icon={CalendarDays}>
              {e.missingDays.length ? (
                <p className="text-sm text-muted-foreground">
                  {e.missingDays.map(fmtDay).join(", ")} ficaram sem registro. Sem culpa — o importante é seguir a partir de hoje.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Você registrou todos os dias da semana. Excelente constância! 🎉</p>
              )}
            </Panel>
          </div>
        )}

        <h2 className="font-display text-xl font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Conquistas
        </h2>
        <AchievementsGrid items={e.achievements} />
      </div>
    </div>
  );
};

export default Insights;