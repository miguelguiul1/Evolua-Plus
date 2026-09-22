import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, ThumbsDown, AlertTriangle, Target, Check, X } from "lucide-react";
import MotivationalQuote from "@/components/MotivationalQuote";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncModules } from "@/hooks/useNutrition";
import { ALL_FOODS, RESTRICTIONS } from "@/data/preferencias";
import { OBJECTIVES, normalizeObjective, objectiveOption } from "@/lib/objectives";

const Preferencias = () => {
  const sync = useSyncModules();
  const qc = useQueryClient();
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [otherRestriction, setOtherRestriction] = useState("");
  const [selectedObjective, setSelectedObjective] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [objectiveError, setObjectiveError] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load preferences from DB
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    const load = async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      if (data) {
        // Valores legados são normalizados para a taxonomia única de objectives.ts
        setSelectedObjective(normalizeObjective(data.objective) ?? "");
        setLiked(data.liked_foods || []);
        setDisliked(data.disliked_foods || []);
        const all = data.restrictions || [];
        setSelectedRestrictions(all.filter((r: string) => RESTRICTIONS.includes(r)));
        const other = all.find((r: string) => !RESTRICTIONS.includes(r));
        if (other) setOtherRestriction(other);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user, retryKey]);

  const busy = saving || loading;

  const toggleLiked = (food: string) => {
    setDisliked((prev) => prev.filter((f) => f !== food));
    setLiked((prev) => prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food]);
  };

  const toggleDisliked = (food: string) => {
    setLiked((prev) => prev.filter((f) => f !== food));
    setDisliked((prev) => prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food]);
  };

  const toggleRestriction = (r: string) => {
    setSelectedRestrictions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Faça login para salvar", description: "Crie uma conta para salvar suas preferências.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    // Validação antes de salvar — objetivo é obrigatório e vem da taxonomia única
    if (!normalizeObjective(selectedObjective)) {
      setObjectiveError(true);
      toast({
        title: "Escolha um objetivo",
        description: "Selecione um objetivo acima para salvar suas preferências.",
        variant: "destructive",
      });
      document.getElementById("objetivo-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setObjectiveError(false);
    setSaving(true);
    try {
      const allRestrictions = [...selectedRestrictions, otherRestriction.trim()].filter(Boolean);
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          objective: normalizeObjective(selectedObjective),
          liked_foods: liked,
          disliked_foods: disliked,
          restrictions: allRestrictions,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
      sync(["prefs"]);
      // O objetivo influencia o onboarding/setup status — mantém tudo consistente.
      qc.invalidateQueries({ queryKey: ["setupStatus"] });
      toast({
        title: "Preferências salvas.",
        description: "Seu plano e as sugestões da IA usarão essas preferências.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Não foi possível salvar agora. Tente novamente.";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Meu Perfil <span className="text-primary">Alimentar</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Personalize suas preferências para receber sugestões sob medida
          </p>
        </div>

        <MotivationalQuote />

        {loadError && (
          <div role="alert" className="mt-6 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">
              Não foi possível carregar suas preferências salvas.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryKey((k) => k + 1)}
              disabled={busy}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Objective */}
        <div className="mt-10" id="objetivo-section">
          <h2 className="font-display text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Qual seu objetivo?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">Obrigatório — orienta seu plano e suas metas.</p>
          {objectiveError && !selectedObjective && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              Escolha um objetivo antes de salvar.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OBJECTIVES.map((obj) => (
              <button
                key={obj.id}
                onClick={() => {
                  setSelectedObjective(obj.id);
                  if (objectiveError) setObjectiveError(false);
                }}
                disabled={busy}
                aria-pressed={selectedObjective === obj.id}
                className={`p-4 rounded-xl border-2 transition-all text-left disabled:opacity-60 ${
                  selectedObjective === obj.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span className="text-2xl">{obj.emoji}</span>
                <p className="font-display font-semibold text-foreground text-sm mt-2">{obj.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{obj.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Restrictions */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent" /> Restrições alimentares
          </h2>
          <div className="flex flex-wrap gap-2">
            {RESTRICTIONS.map((r) => (
              <button
                key={r}
                onClick={() => toggleRestriction(r)}
                disabled={busy}
                aria-pressed={selectedRestrictions.includes(r)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-60 ${
                  selectedRestrictions.includes(r)
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={otherRestriction}
            onChange={(e) => setOtherRestriction(e.target.value)}
            aria-label="Outra restrição"
            placeholder="Outra restrição (ex: alergia a nozes, FODMAP...)"
            maxLength={100}
            className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Foods */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            Selecione seus alimentos
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            <Heart className="w-4 h-4 inline text-primary" aria-hidden="true" /> = gosto &nbsp;
            <ThumbsDown className="w-4 h-4 inline text-destructive" aria-hidden="true" /> = não gosto
          </p>

          {Object.entries(ALL_FOODS).map(([category, foods]) => (
            <div key={category} className="mb-8">
              <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {foods.map((food) => {
                  const isLiked = liked.includes(food);
                  const isDisliked = disliked.includes(food);
                  return (
                    <div key={food} className="flex items-center gap-0.5">
                      <button
                        onClick={() => toggleLiked(food)}
                        disabled={busy}
                        aria-pressed={isLiked}
                        className={`pl-3 pr-1 py-1.5 rounded-l-full text-sm font-medium transition-all border-2 border-r-0 disabled:opacity-60 ${
                          isLiked
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-secondary border-border text-secondary-foreground hover:border-primary/30"
                        }`}
                      >
                        {food}
                        {isLiked && <Check className="w-3 h-3 inline ml-1" aria-hidden="true" />}
                      </button>
                      <button
                        onClick={() => toggleDisliked(food)}
                        disabled={busy}
                        aria-label={`Não gosto de ${food}`}
                        aria-pressed={isDisliked}
                        className={`px-2 py-1.5 rounded-r-full text-sm transition-all border-2 border-l-0 disabled:opacity-60 ${
                          isDisliked
                            ? "bg-destructive/10 border-destructive text-destructive"
                            : "bg-secondary border-border text-muted-foreground hover:border-destructive/30"
                        }`}
                        title="Não gosto"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card rounded-2xl p-6 shadow-soft mt-8">
          <h3 className="font-display font-semibold text-foreground mb-3">Resumo</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Objetivo</p>
              <p className="font-medium text-foreground">
                {objectiveOption(selectedObjective)?.label || "Não selecionado"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Restrições</p>
              <p className="font-medium text-foreground">
                {selectedRestrictions.length > 0 ? selectedRestrictions.join(", ") : "Nenhuma"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Alimentos que gosta</p>
              <p className="font-medium text-primary">{liked.length} selecionados</p>
            </div>
            <div>
              <p className="text-muted-foreground">Alimentos que não gosta</p>
              <p className="font-medium text-destructive">{disliked.length} marcados</p>
            </div>
          </div>
          <Button variant="hero" size="lg" className="w-full mt-6" onClick={handleSave} disabled={busy}>
            {saving ? "Salvando..." : loading ? "Carregando..." : "Salvar preferências"}
          </Button>
          {!user && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Faça <button onClick={() => navigate("/auth")} className="text-primary font-semibold underline">login</button> para salvar suas preferências
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Preferencias;
