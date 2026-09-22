import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Sparkles,
  RefreshCw, Apple, Coffee, Sun, Moon, Cookie, Pencil, Search, Star, X, Camera, Bot, Download,
} from "lucide-react";
import MotivationalQuote from "@/components/MotivationalQuote";
import WaterTracker from "@/components/WaterTracker";
import FoodCalendar from "@/components/diario/FoodCalendar";
import WeeklySummary from "@/components/diario/WeeklySummary";
import { exportPdfCompat } from "@/lib/pdfExport";
import { RANGES, checkRange, checkText, firstError, parseNum } from "@/lib/validation";
import { ConfirmDialog } from "@/components/ds/ConfirmDialog";
import {
  FoodEntry, MEAL_TYPES, sumTotals, todayISO, toISODate,
  useFavorites, useFoodLog, useFoodLogRange, useGoals, useSyncModules,
} from "@/hooks/useNutrition";

interface DailyAnalysis {
  resumo: { calorias_total: number; proteina_total: number; carb_total: number; gordura_total: number; fibra_total: number };
  meta_sugerida: { calorias: number; proteina: number; carbs: number; gordura: number; fibra: number };
  pontuacao: number;
  status: string;
  excessos: string[];
  deficiencias: string[];
  sugestoes: string[];
  proximo_passo: string;
}

const mealIcons: Record<string, typeof Coffee> = {
  cafe: Coffee, almoco: Sun, lanche: Cookie, jantar: Moon, outro: Apple,
};

/**
 * Valida a quantidade digitada ("150g", "2 unidades", "300 ml").
 * Aceita unidades livres, mas quando há número ele precisa respeitar o intervalo do banco.
 */
const validateQuantity = (raw: string): string | null => {
  const text = checkText(raw, "a quantidade", 60);
  if (text) return text;
  const numMatch = raw.trim().replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!numMatch) return null;
  const n = parseNum(numMatch[0]);
  if (n === null) return "Informe uma quantidade válida";
  return checkRange(n, RANGES.porcao);
};

const DiarioAlimentar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sync = useSyncModules();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [mealType, setMealType] = useState("almoco");
  const [adding, setAdding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DailyAnalysis | null>(null);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editMeal, setEditMeal] = useState("almoco");

  const rangeFrom = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() - 45);
    return toISODate(d);
  }, [selectedDate]);

  const { data: entries = [], isLoading } = useFoodLog(selectedDate);
  const { data: rangeEntries = [] } = useFoodLogRange(rangeFrom, selectedDate);
  const { data: goals } = useGoals();
  const { data: favorites = [] } = useFavorites();

  const caloriesGoal = goals?.calories_goal ?? 2000;
  const totals = sumTotals(entries);

  const suggestions = useMemo(() => {
    const q = foodName.trim().toLowerCase();
    if (q.length < 2) return [];
    const recent = Array.from(
      new Map(rangeEntries.map((e) => [e.food_name.toLowerCase(), e])).values()
    );
    const favMatches = favorites
      .filter((f) => f.food_name.toLowerCase().includes(q))
      .map((f) => ({
        name: f.food_name,
        qty: `${f.portion_g}g`,
        fav: true,
        macros: { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber },
      }));
    const recentMatches = recent
      .filter((e) => e.food_name.toLowerCase().includes(q) && !favMatches.some((f) => f.name.toLowerCase() === e.food_name.toLowerCase()))
      .map((e) => ({
        name: e.food_name,
        qty: e.quantity,
        fav: false,
        macros: { calories: Number(e.calories), protein: Number(e.protein), carbs: Number(e.carbs), fat: Number(e.fat), fiber: Number(e.fiber) },
      }));
    return [...favMatches, ...recentMatches].slice(0, 5);
  }, [foodName, favorites, rangeEntries]);

  const insertEntry = async (row: Omit<FoodEntry, "id" | "logged_at">) => {
    const { error } = await supabase.from("food_log").insert({
      user_id: user!.id,
      logged_at: selectedDate,
      ...row,
    });
    if (error) throw error;
    setAnalysis(null);
    sync(["food"]);
  };

  const addFromSuggestion = async (s: (typeof suggestions)[number]) => {
    setAdding(true);
    try {
      await insertEntry({
        food_name: s.name,
        quantity: s.qty,
        meal_type: mealType,
        calories: s.macros.calories,
        protein: s.macros.protein,
        carbs: s.macros.carbs,
        fat: s.macros.fat,
        fiber: s.macros.fiber,
      });
      setFoodName("");
      setQuantity("");
      toast.success("Alimento adicionado ao diário.", { description: `${s.name} · ${s.qty}` });
    } catch (e) {
      toast.error("Erro ao adicionar", { description: (e as Error).message });
    } finally {
      setAdding(false);
    }
  };

  const addFood = async () => {
    const invalid = firstError([
      checkText(foodName, "o nome do alimento", 200),
      validateQuantity(quantity),
    ]);
    if (invalid) return toast.error("Verifique os dados", { description: invalid });
    setAdding(true);
    try {
      const { data: estimate, error: estError } = await supabase.functions.invoke("nutrition-tracker", {
        body: { action: "estimate", foodName, quantity },
      });
      if (estError) throw estError;
      if (estimate?.error) throw new Error(estimate.error);

      await insertEntry({
        food_name: foodName,
        quantity,
        meal_type: mealType,
        calories: estimate.calories || 0,
        protein: estimate.protein || 0,
        carbs: estimate.carbs || 0,
        fat: estimate.fat || 0,
        fiber: estimate.fiber || 0,
      });
      toast.success("Alimento adicionado ao diário.", { description: `${foodName} · ${quantity}` });
      setFoodName("");
      setQuantity("");
    } catch (e) {
      toast.error("Erro ao adicionar", { description: (e as Error).message });
    } finally {
      setAdding(false);
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("food_log").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    setAnalysis(null);
    sync(["food"]);
    toast.success("Refeição removida do diário.");
  };

  const openEdit = (e: FoodEntry) => {
    setEditing(e);
    setEditQty(e.quantity);
    setEditMeal(e.meal_type);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const invalid = validateQuantity(editQty);
    if (invalid) return toast.error("Quantidade inválida", { description: invalid });
    const oldQ = parseFloat(editing.quantity.replace(",", ".")) || 0;
    const newQ = parseFloat(editQty.replace(",", ".")) || 0;
    const f = oldQ > 0 && newQ > 0 ? newQ / oldQ : 1;
    const r = (v: number) => Math.round(Number(v) * f * 10) / 10;
    const { error } = await supabase
      .from("food_log")
      .update({
        quantity: editQty,
        meal_type: editMeal,
        calories: r(editing.calories),
        protein: r(editing.protein),
        carbs: r(editing.carbs),
        fat: r(editing.fat),
        fiber: r(editing.fiber),
      })
      .eq("id", editing.id);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    setEditing(null);
    setAnalysis(null);
    sync(["food"]);
    toast.success("Refeição atualizada.");
  };

  const analyzeDay = async () => {
    if (entries.length === 0) return toast("Adicione alimentos primeiro");
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("nutrition-tracker", {
        body: {
          action: "analyze",
          dailyLog: entries.map((e) => ({
            alimento: e.food_name, quantidade: e.quantity, refeicao: e.meal_type,
            calorias: e.calories, proteina: e.protein, carbs: e.carbs, gordura: e.fat, fibra: e.fiber,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as DailyAnalysis);
    } catch (e) {
      toast.error("Erro na análise", { description: (e as Error).message });
    } finally {
      setAnalyzing(false);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "excelente" || s === "bom") return <CheckCircle className="w-5 h-5 text-primary" />;
    if (s === "regular") return <AlertTriangle className="w-5 h-5 text-accent" />;
    return <TrendingDown className="w-5 h-5 text-destructive" />;
  };
  const statusLabel: Record<string, string> = {
    excelente: "Excelente! 🏆", bom: "Bom! 👍", regular: "Regular ⚠️", precisa_melhorar: "Precisa melhorar 📉",
  };

  const macroCards = [
    { label: "kcal", value: Math.round(totals.calories), cls: "text-foreground" },
    { label: "prot", value: `${Math.round(totals.protein)}g`, cls: "text-primary" },
    { label: "carb", value: `${Math.round(totals.carbs)}g`, cls: "text-accent" },
    { label: "gord", value: `${Math.round(totals.fat)}g`, cls: "text-foreground" },
    { label: "fibra", value: `${Math.round(totals.fiber)}g`, cls: "text-primary" },
  ];

  const exportDayPdf = async () => {
    const groups = entries.reduce<Record<string, typeof entries>>((acc, e) => {
      (acc[e.meal_type] ||= []).push(e);
      return acc;
    }, {});
    await exportPdfCompat({
      title: `Diário alimentar — ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR")}`,
      subtitle: `${Math.round(totals.calories)} / ${caloriesGoal} kcal · P ${Math.round(totals.protein)}g · C ${Math.round(totals.carbs)}g · G ${Math.round(totals.fat)}g · Fibra ${Math.round(totals.fiber)}g`,
      sections: Object.entries(groups).map(([meal, rows]) => ({
        title: meal.charAt(0).toUpperCase() + meal.slice(1),
        lines: rows.map(
          (r) => `${r.food_name} (${r.quantity}) — ${Math.round(Number(r.calories))} kcal · P ${Math.round(Number(r.protein))}g · C ${Math.round(Number(r.carbs))}g · G ${Math.round(Number(r.fat))}g`
        ),
      })),
      fileName: `evolua-plus-diario-${selectedDate}.pdf`,
    });
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <div className="text-center mb-8">
          <span className="inline-block mb-3 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-display text-sm font-medium">
            📊 Acompanhamento diário
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Diário <span className="text-primary">Alimentar</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
            Registre o que come e a IA analisa sua nutrição, compara com suas metas e sugere melhorias.
          </p>
        </div>

        {/* Atalhos */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/scanner"><Camera className="w-4 h-4" /> Escanear alimento</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/assistente"><Bot className="w-4 h-4" /> Falar com a IA</Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          {/* Coluna lateral */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            <FoodCalendar
              entries={rangeEntries}
              selectedDate={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setAnalysis(null); }}
              caloriesGoal={caloriesGoal}
            />
            <WeeklySummary entries={rangeEntries} caloriesGoal={caloriesGoal} endDate={selectedDate} />
            {selectedDate === todayISO() && <WaterTracker compact />}
          </aside>

          <div className="space-y-5">
            {/* Adicionar alimento */}
            <div className="bg-card rounded-2xl shadow-soft p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Adicionar alimento
              </h2>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                {MEAL_TYPES.map((m) => {
                  const Icon = mealIcons[m.id];
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMealType(m.id)}
                      className={`p-2 rounded-xl text-[11px] font-medium transition-all flex flex-col items-center gap-1 border-2 ${
                        mealType === m.id
                          ? "bg-primary/10 text-primary border-primary"
                          : "bg-secondary text-muted-foreground border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {m.short}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ou digitar alimento"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === "Enter" && addFood()}
                  />
                </div>
                <Input
                  placeholder="200g"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-24"
                  onKeyDown={(e) => e.key === "Enter" && addFood()}
                />
                <Button variant="hero" onClick={addFood} disabled={adding || !foodName.trim() || !quantity.trim()}>
                  {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>

              {suggestions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Favoritos e registros recentes</p>
                  {suggestions.map((s) => (
                    <button
                      key={`${s.name}-${s.fav}`}
                      onClick={() => addFromSuggestion(s)}
                      disabled={adding}
                      className="w-full text-left rounded-xl bg-secondary/60 hover:bg-secondary px-3 py-2 flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="text-sm text-foreground flex items-center gap-1.5 truncate">
                        {s.fav && <Star className="w-3 h-3 text-accent fill-accent" />}
                        {s.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {s.qty} · {Math.round(s.macros.calories)} kcal
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                A IA calcula automaticamente as calorias e macros de novos alimentos.
              </p>
            </div>

            {/* Resumo do dia */}
            <div className="bg-card rounded-2xl shadow-soft p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-foreground">Resumo do dia</h3>
                <span className="text-xs text-muted-foreground">
                  {Math.round(totals.calories)} / {caloriesGoal} kcal
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totals.calories / caloriesGoal) * 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {macroCards.map((m) => (
                  <div key={m.label} className="bg-secondary/50 rounded-xl p-2.5">
                    <p className={`font-display font-bold text-sm ${m.cls}`}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Refeições */}
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
            ) : entries.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-soft p-10 text-center">
                <Apple className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-display font-semibold text-foreground mb-1">Nenhum alimento registrado</p>
                <p className="text-sm text-muted-foreground">Comece adicionando o que você comeu neste dia.</p>
              </div>
            ) : (
              MEAL_TYPES.map((m) => {
                const mealEntries = entries.filter((e) => e.meal_type === m.id);
                if (!mealEntries.length) return null;
                const Icon = mealIcons[m.id];
                const mt = sumTotals(mealEntries);
                return (
                  <div key={m.id}>
                    <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Icon className="w-4 h-4" /> {m.label}
                      <span className="ml-auto normal-case tracking-normal font-normal">{Math.round(mt.calories)} kcal</span>
                    </h3>
                    <div className="space-y-2">
                      {mealEntries.map((entry) => (
                        <div key={entry.id} className="bg-card rounded-xl shadow-soft p-3 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{entry.food_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.quantity} · {Math.round(Number(entry.calories))} kcal · P:{Math.round(Number(entry.protein))}g
                              {" "}· C:{Math.round(Number(entry.carbs))}g · G:{Math.round(Number(entry.fat))}g · F:{Math.round(Number(entry.fiber))}g
                            </p>
                          </div>
                          <button
                            onClick={() => openEdit(entry)}
                            aria-label="Editar refeição"
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              navigate(
                                `/assistente?q=${encodeURIComponent(
                                  `Analise esta refeição do meu diário: ${entry.food_name} (${entry.quantity}) — ${Math.round(Number(entry.calories))} kcal, P ${Math.round(Number(entry.protein))}g, C ${Math.round(Number(entry.carbs))}g, G ${Math.round(Number(entry.fat))}g, F ${Math.round(Number(entry.fiber))}g. Traga resumo nutricional, pontos positivos, possíveis melhorias e uma sugestão de complemento.`,
                                )}`,
                              )
                            }
                            aria-label="Analisar refeição com a IA"
                            title="Analisar com a IA"
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <ConfirmDialog
                            trigger={
                              <button
                                aria-label="Excluir refeição"
                                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            }
                            title="Excluir refeição"
                            description={`Deseja excluir "${entry.food_name}" do diário? Essa ação não pode ser desfeita.`}
                            onConfirm={() => deleteEntry(entry.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {/* Edição inline */}
            {editing && (
              <div className="bg-card rounded-2xl shadow-soft border border-primary/30 p-5 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-foreground">Editar “{editing.food_name}”</h3>
                  <button onClick={() => setEditing(null)} aria-label="Fechar edição" className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {MEAL_TYPES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setEditMeal(m.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        editMeal === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {m.short}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={editQty} onChange={(e) => setEditQty(e.target.value)} placeholder="Quantidade" className="flex-1" />
                  <Button onClick={saveEdit}>Salvar</Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Os macros são recalculados proporcionalmente quando a quantidade muda.
                </p>
              </div>
            )}

            {entries.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="hero" size="lg" onClick={analyzeDay} disabled={analyzing} className="gap-2">
                  {analyzing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Analisando...</> : <><Zap className="w-5 h-5" /> Analisar dia com IA</>}
                </Button>
                <Button variant="outline" size="lg" onClick={exportDayPdf} className="gap-2">
                  <Download className="w-5 h-5" /> Exportar PDF
                </Button>
              </div>
            )}

            {analysis && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-card rounded-2xl shadow-soft p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {statusIcon(analysis.status)}
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      {statusLabel[analysis.status] || analysis.status}
                    </h2>
                  </div>
                  <div className="w-28 h-28 mx-auto relative mb-3">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${analysis.pontuacao}, 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-3xl font-bold text-foreground">{analysis.pontuacao}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Pontuação alimentar do dia</p>
                </div>

                <div className="bg-card rounded-2xl shadow-soft p-6">
                  <h3 className="font-display font-semibold text-foreground mb-4">📊 Consumo vs Meta</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Calorias", consumed: analysis.resumo.calorias_total, goal: analysis.meta_sugerida.calorias, unit: "kcal" },
                      { label: "Proteína", consumed: analysis.resumo.proteina_total, goal: analysis.meta_sugerida.proteina, unit: "g" },
                      { label: "Carboidratos", consumed: analysis.resumo.carb_total, goal: analysis.meta_sugerida.carbs, unit: "g" },
                      { label: "Gordura", consumed: analysis.resumo.gordura_total, goal: analysis.meta_sugerida.gordura, unit: "g" },
                      { label: "Fibra", consumed: analysis.resumo.fibra_total, goal: analysis.meta_sugerida.fibra, unit: "g" },
                    ].map((item) => {
                      const pct = item.goal > 0 ? Math.min((item.consumed / item.goal) * 100, 150) : 0;
                      const over = pct > 110, under = pct < 80;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-foreground font-medium">{item.label}</span>
                            <span className={`font-display font-semibold ${over ? "text-destructive" : under ? "text-accent" : "text-primary"}`}>
                              {Math.round(item.consumed)} / {Math.round(item.goal)} {item.unit}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-border overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${over ? "bg-destructive" : under ? "bg-accent" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {analysis.excessos?.length > 0 && (
                    <div className="bg-card rounded-2xl shadow-soft p-4">
                      <h3 className="font-display text-sm font-semibold text-destructive mb-2 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> Excessos
                      </h3>
                      <ul className="space-y-1">
                        {analysis.excessos.map((e, i) => <li key={i} className="text-xs text-muted-foreground">• {e}</li>)}
                      </ul>
                    </div>
                  )}
                  {analysis.deficiencias?.length > 0 && (
                    <div className="bg-card rounded-2xl shadow-soft p-4">
                      <h3 className="font-display text-sm font-semibold text-accent mb-2 flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" /> Deficiências
                      </h3>
                      <ul className="space-y-1">
                        {analysis.deficiencias.map((d, i) => <li key={i} className="text-xs text-muted-foreground">• {d}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {analysis.sugestoes?.length > 0 && (
                  <div className="bg-card rounded-2xl shadow-soft p-6">
                    <h3 className="font-display font-semibold text-foreground mb-3">💡 Sugestões da IA</h3>
                    <div className="space-y-2">
                      {analysis.sugestoes.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-display font-bold text-[10px]">
                            {i + 1}
                          </span>
                          <p className="text-muted-foreground">{s}</p>
                        </div>
                      ))}
                    </div>
                    {analysis.proximo_passo && (
                      <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-sm text-foreground">🎯 <strong>Próximo passo:</strong> {analysis.proximo_passo}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <MotivationalQuote />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiarioAlimentar;