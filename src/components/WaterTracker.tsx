import { useEffect, useState } from "react";
import { Droplet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";
import { toast } from "sonner";
import { todayISO, useSyncModules } from "@/hooks/useNutrition";

const INCREMENTS = [250, 500, 750, 1000];

const motivational = (pct: number) => {
  if (pct >= 100) return "🎉 Parabéns! Meta de água concluída.";
  if (pct >= 75) return "💧 Você está próximo da sua meta!";
  if (pct >= 40) return "👏 Ótimo trabalho! Continue se hidratando.";
  if (pct > 0) return "💦 Bom começo — mantenha o ritmo.";
  return "🚰 Que tal começar com um copo d'água agora?";
};

type Props = { compact?: boolean };

const WaterTracker = ({ compact = false }: Props) => {
  const { user } = useAuth();
  const sync = useSyncModules();
  const [total, setTotal] = useState(0);
  const [goal, setGoal] = useState(2500);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const today = todayISO();

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const [{ data: logs, error: logsErr }, { data: goals, error: goalsErr }] = await Promise.all([
        supabase.from("water_log").select("amount_ml").eq("user_id", user.id).eq("logged_at", today),
        supabase.from("user_goals").select("water_goal_ml").eq("user_id", user.id).maybeSingle(),
      ]);
      if (logsErr || goalsErr) throw logsErr || goalsErr;
      setTotal((logs || []).reduce((s, r) => s + (r.amount_ml || 0), 0));
      if (goals?.water_goal_ml) setGoal(goals.water_goal_ml);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` só depende de `user`/`today` (já cobertos); incluí-la recriaria o efeito a cada render, pois sua identidade muda sempre.
  }, [user, retryKey]);

  const addWater = async (ml: number) => {
    if (!user) { toast.error("Faça login para registrar"); return; }
    const prev = total;
    setTotal(prev + ml);
    const { error } = await supabase
      .from("water_log")
      .insert({ user_id: user.id, amount_ml: ml, logged_at: today });
    if (error) { setTotal(prev); toast.error("Erro ao registrar"); return; }
    sync(["water"]);
    const newPct = ((prev + ml) / goal) * 100;
    if (prev < goal && prev + ml >= goal) toast.success("🎉 Meta de hidratação atingida!");
    else if (newPct >= 75 && (prev / goal) * 100 < 75) toast("💧 Quase lá!");
  };

  const undoLast = async () => {
    if (!user) return;
    const { data } = await supabase.from("water_log").select("id, amount_ml")
      .eq("user_id", user.id).eq("logged_at", today)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return;
    await supabase.from("water_log").delete().eq("id", data.id);
    setTotal((t) => Math.max(0, t - data.amount_ml));
    sync(["water"]);
  };

  const pct = Math.min(100, Math.round((total / goal) * 100));

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Droplet className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground text-sm">Hidratação</h3>
            <p className="text-xs text-muted-foreground">
              {loading ? "..." : loadError ? "indisponível" : `${(total / 1000).toFixed(2)}L de ${(goal / 1000).toFixed(1)}L`}
            </p>
          </div>
        </div>
        <span className="text-2xl font-bold text-blue-500">{pct}%</span>
      </div>

      <div className="h-3 bg-secondary rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {loadError ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
          <p className="text-xs text-destructive">Não foi possível carregar sua hidratação.</p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-xs font-medium text-destructive underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-4 min-h-4">{motivational(pct)}</p>
      )}

      <div className={`grid ${compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4"} gap-2`}>
        {INCREMENTS.map((ml) => (
          <button
            key={ml}
            onClick={() => addWater(ml)}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
          </button>
        ))}
      </div>

      {total > 0 && (
        <button
          onClick={undoLast}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground w-full text-center"
        >
          Desfazer último registro
        </button>
      )}
    </div>
  );
};

export default WaterTracker;