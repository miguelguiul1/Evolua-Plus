import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FoodEntry, toISODate } from "@/hooks/useNutrition";

type Props = {
  entries: FoodEntry[];
  selectedDate: string;
  onSelect: (date: string) => void;
  caloriesGoal: number;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const FoodCalendar = ({ entries, selectedDate, onSelect, caloriesGoal }: Props) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDate = useMemo(() => {
    const map: Record<string, { kcal: number; count: number }> = {};
    entries.forEach((e) => {
      const cur = (map[e.logged_at] ||= { kcal: 0, count: 0 });
      cur.kcal += Number(e.calories || 0);
      cur.count += 1;
    });
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const pad = first.getDay();
    return [
      ...Array.from({ length: pad }, () => null),
      ...Array.from({ length: total }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
    ];
  }, [cursor]);

  const today = toISODate(new Date());
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const statusOf = (iso: string) => {
    const d = byDate[iso];
    if (!d || d.count === 0) return "none";
    if (d.count >= 3 || d.kcal >= caloriesGoal * 0.8) return "full";
    return "partial";
  };

  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => shift(-1)}
          aria-label="Mês anterior"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="font-display font-semibold text-sm text-foreground capitalize">{monthLabel}</p>
        <button
          onClick={() => shift(1)}
          aria-label="Próximo mês"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0 sm:gap-1 -mx-3 sm:mx-0 mb-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] text-center text-muted-foreground font-medium">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0 sm:gap-1 -mx-3 sm:mx-0">
        {days.map((d, i) => {
          if (!d) return <span key={`p${i}`} />;
          const iso = toISODate(d);
          const status = statusOf(iso);
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          const isFuture = iso > today;
          return (
            <button
              key={iso}
              disabled={isFuture}
              onClick={() => onSelect(iso)}
              aria-label={`Dia ${d.getDate()}`}
              className={`h-11 sm:h-auto sm:aspect-square min-w-0 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-0.5 transition-all disabled:opacity-30 ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "bg-secondary text-foreground ring-1 ring-primary/40"
                    : "hover:bg-secondary text-foreground"
              }`}
            >
              {d.getDate()}
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === "full"
                    ? isSelected ? "bg-primary-foreground" : "bg-primary"
                    : status === "partial"
                      ? isSelected ? "bg-primary-foreground/60" : "bg-accent"
                      : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> Dia completo</span>
        <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> Parcial</span>
        <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-border inline-block" /> Sem registro</span>
      </div>
    </div>
  );
};

export default FoodCalendar;