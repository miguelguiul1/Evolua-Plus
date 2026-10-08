import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FoodEntry, sumTotals, toISODate } from "@/hooks/useNutrition";

type Props = { entries: FoodEntry[]; caloriesGoal: number; endDate: string };

const WeeklySummary = ({ entries, caloriesGoal, endDate }: Props) => {
  const data = useMemo(() => {
    const end = new Date(`${endDate}T12:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(end);
      d.setDate(end.getDate() - (6 - i));
      const iso = toISODate(d);
      const rows = entries.filter((e) => e.logged_at === iso);
      const t = sumTotals(rows);
      return {
        iso,
        dia: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        kcal: Math.round(t.calories),
        proteina: Math.round(t.protein),
      };
    });
  }, [entries, endDate]);

  const registered = data.filter((d) => d.kcal > 0);
  const avg = registered.length
    ? Math.round(registered.reduce((s, d) => s + d.kcal, 0) / registered.length)
    : 0;
  const avgProtein = registered.length
    ? Math.round(registered.reduce((s, d) => s + d.proteina, 0) / registered.length)
    : 0;

  return (
    <div className="bg-card rounded-2xl shadow-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-display font-semibold text-foreground">Resumo semanal</h3>
        <p className="text-xs text-muted-foreground">
          {registered.length}/7 dias registrados · média {avg} kcal · {avgProtein}g proteína
        </p>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="dia" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }}
              formatter={(v: number) => [`${v} kcal`, "Consumo"]}
            />
            <ReferenceLine y={caloriesGoal} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
            <Bar dataKey="kcal" fill="hsl(var(--muted-foreground) / 0.45)" radius={[6, 6, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        Linha tracejada = sua meta diária de {caloriesGoal} kcal
      </p>
    </div>
  );
};

export default WeeklySummary;