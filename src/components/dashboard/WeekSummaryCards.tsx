import { Link } from "react-router-dom";
import { CalendarRange, TrendingUp, Flame, Beef, Droplets, Utensils, CalendarCheck } from "lucide-react";
import { useEngagement } from "@/hooks/useEngagement";

const fmtKg = (v: number) => `${Math.abs(v).toFixed(1).replace(".", ",")} kg`;

/** Resumo da Semana + Evolução — leitura rápida do progresso real do usuário. */
const WeekSummaryCards = () => {
  const e = useEngagement();
  const { averages, week, weights, weightDelta, goals } = e;

  const mealsWeek = week.reduce((s, d) => s + d.logged, 0);
  const frequencia = Math.round((averages.loggedDays / 7) * 100);

  const items = [
    { icon: Flame, label: "Calorias médias", value: averages.calories ? `${averages.calories} kcal` : "—" },
    { icon: Beef, label: "Proteínas médias", value: averages.protein ? `${averages.protein} g` : "—" },
    { icon: Droplets, label: "Hidratação média", value: averages.water ? `${(averages.water / 1000).toFixed(1)} L` : "—" },
    { icon: Utensils, label: "Refeições registradas", value: `${mealsWeek}` },
    { icon: CalendarCheck, label: "Frequência de uso", value: `${frequencia}%` },
    { icon: TrendingUp, label: "Score médio", value: averages.score ? `${averages.score}/100` : "—" },
  ];

  // Evolução automática (30 dias)
  const cutoff = Date.now() - 30 * 86400000;
  const recent = weights.filter((w) => new Date(String(w.logged_at)).getTime() >= cutoff);
  const base = recent[0] ?? weights[0];
  const last = weights[weights.length - 1];

  const frases: string[] = [];
  if (base && last && base !== last) {
    const dw = Number(last.weight_kg) - Number(base.weight_kg);
    if (Math.abs(dw) >= 0.1)
      frases.push(`Você ${dw < 0 ? "perdeu" : "ganhou"} ${fmtKg(dw)} nos últimos 30 dias.`);
    const bw = base.waist_cm != null ? Number(base.waist_cm) : null;
    const lw = last.waist_cm != null ? Number(last.waist_cm) : null;
    if (bw && lw && Math.abs(lw - bw) >= 0.5)
      frases.push(`Sua cintura ${lw < bw ? "reduziu" : "aumentou"} ${Math.abs(lw - bw).toFixed(1).replace(".", ",")} cm.`);
  }
  const firstHalf = week.slice(0, 3);
  const secondHalf = week.slice(4);
  const avgOf = (arr: typeof week, k: "water" | "logged") =>
    arr.length ? arr.reduce((s, d) => s + d[k], 0) / arr.length : 0;
  const w1 = avgOf(firstHalf, "water");
  const w2 = avgOf(secondHalf, "water");
  if (w1 > 0 && Math.abs(w2 - w1) / w1 >= 0.1)
    frases.push(`Sua hidratação ${w2 > w1 ? "melhorou" : "caiu"} ${Math.round((Math.abs(w2 - w1) / w1) * 100)}% nesta semana.`);
  const l1 = avgOf(firstHalf, "logged");
  const l2 = avgOf(secondHalf, "logged");
  if (l2 > l1) frases.push("Sua frequência de registros aumentou nesta semana.");
  if (averages.water >= goals.waterGoal && goals.waterGoal > 0)
    frases.push("Sua média de hidratação está acima da meta. Excelente constância!");
  if (!frases.length)
    frases.push("Registre peso e medidas por alguns dias para acompanhar sua evolução automática aqui.");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <section className="bg-card rounded-2xl shadow-soft border border-border/50 p-5">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <CalendarRange className="w-4 h-4" />
          </span>
          Resumo da semana
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {items.map((i) => (
            <div key={i.label} className="rounded-xl bg-secondary/40 p-3 transition-colors hover:bg-secondary/70">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <i.icon className="w-3.5 h-3.5" /> {i.label}
              </p>
              <p className="font-display font-bold text-foreground mt-1">{i.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Baseado nos últimos 7 dias · {averages.loggedDays} dia(s) com registro
        </p>
      </section>

      <section className="bg-card rounded-2xl shadow-soft border border-border/50 p-5">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
          <span className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </span>
          Evolução
        </h2>
        <ul className="space-y-2.5">
          {frases.slice(0, 4).map((f) => (
            <li key={f} className="text-sm text-muted-foreground flex gap-2 animate-fade-in">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        {weights.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 border-t border-border/60 pt-3">
            Variação total desde o primeiro registro:{" "}
            <strong className="text-foreground">
              {weightDelta > 0 ? "+" : weightDelta < 0 ? "−" : ""}{fmtKg(weightDelta)}
            </strong>
          </p>
        )}
        <Link to="/evolucao" className="text-sm font-medium text-primary hover:underline mt-3 inline-block">
          Abrir evolução corporal
        </Link>
      </section>
    </div>
  );
};

export default WeekSummaryCards;