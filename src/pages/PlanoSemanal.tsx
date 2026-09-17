import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Lightbulb, RefreshCw, ChevronDown, ChevronUp, FileDown, Plus, Shuffle, AlertTriangle, Target, Sparkles, Dumbbell, Droplets, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import MotivationalQuote from "@/components/MotivationalQuote";
import SmartShoppingList from "@/components/plano/SmartShoppingList";
import { exportPdfCompat } from "@/lib/pdfExport";
import { todayISO, useGoals, usePreferences } from "@/hooks/useNutrition";
import { useRoutineProfile } from "@/hooks/useRoutineProfile";
import { normalizeObjective, objectiveOption } from "@/lib/objectives";
import { loadStoredPlano, saveStoredPlano } from "@/lib/planoStorage";

interface OpcaoRefeicao {
  nome: string;
  calorias: number;
  proteina: number;
  carb: number;
  gordura: number;
  ingredientes: string[];
  preparo: string;
}

interface Refeicao extends OpcaoRefeicao {
  tipo: string;
  /** 1-3 opções equivalentes; a primeira é sempre a principal/recomendada. */
  opcoes?: OpcaoRefeicao[];
}

interface DiaPlano {
  dia: string;
  refeicoes: Refeicao[];
}

/** Sugestões alimentares em torno do treino — só existe quando o usuário treina (nunca fármacos/doses de suplemento). */
interface Suplementacao {
  pre_treino?: string | null;
  intra_treino?: string | null;
  pos_treino?: string | null;
}

interface PlanoSemanal {
  plano: DiaPlano[];
  resumo: { calorias_media: number; proteina_media: number; carb_media: number; gordura_media: number };
  lista_compras: string[];
  custo_estimado: string;
  dicas: string[];
  suplementacao?: Suplementacao | null;
}

/** Distribuição sugerida da meta de água ao longo do dia — cálculo local, sem IA nem coluna nova. */
const WATER_SPLIT: { key: "manha" | "tarde" | "noite"; label: string; ratio: number }[] = [
  { key: "manha", label: "Manhã", ratio: 0.3 },
  { key: "tarde", label: "Tarde", ratio: 0.3 },
  { key: "noite", label: "Noite", ratio: 0.4 },
];

const splitWater = (totalMl: number) =>
  WATER_SPLIT.map((s) => ({ ...s, ml: Math.round((totalMl * s.ratio) / 50) * 50 }));

/** Estágios honestos de preparação — sem porcentagem simulada. */
const GERACAO_STAGES = [
  "Preparando seu plano...",
  "Analisando suas preferências...",
  "Montando suas refeições...",
  "Finalizando seu plano...",
];

/** Extrai a mensagem amigável de erros das Edge Functions (nunca stack trace). */
const extrairErro = async (e: unknown): Promise<string> => {
  if (e instanceof FunctionsHttpError) {
    try {
      const payload = await e.context.json();
      if (typeof payload?.error === "string") return payload.error;
    } catch {
      /* corpo vazio ou inválido — usa mensagem padrão */
    }
    return "Não conseguimos montar seu plano agora. Tente novamente.";
  }
  if (e instanceof Error && e.message) return e.message;
  return "Não conseguimos montar seu plano agora. Tente novamente.";
};

const PlanoSemanal = () => {
  const [plano, setPlano] = useState<PlanoSemanal | null>(null);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? null;

  // Fonte única do objetivo: banco do usuário (cache "prefs"), taxonomia de objectives.ts.
  const { data: prefsData, isLoading: prefsLoading } = usePreferences();
  const objective = normalizeObjective(prefsData?.objective);
  const objectiveInfo = objectiveOption(objective);

  // Onboarding avançado opcional — só aparece pra quem quiser mais personalização.
  const { data: routineProfile } = useRoutineProfile();
  const hasRoutineProfile = !!routineProfile?.completed;

  // Hidratação fracionada: mesma meta diária já salva, só dividida visualmente por período.
  const { data: goalsData } = useGoals();
  const waterSplit = splitWater(goalsData?.water_goal_ml ?? 2500);

  // Restaura o último plano gerado do Supabase (com fallback para localStorage antigo).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadStoredPlano(userId).then((saved) => {
      if (cancelled || !saved) return;
      setPlano(saved.plano as unknown as PlanoSemanal);
      setNotes(saved.goal ?? "");
      setExpandedDay(saved.plano.plano[0].dia);
    });
    return () => { cancelled = true; };
  }, [userId]);

  // Persiste alterações no Supabase (inclusive trocas de refeição feitas pela IA).
  useEffect(() => {
    if (!userId || !plano) return;
    saveStoredPlano(userId, { plano, goal: notes });
  }, [plano, notes, userId]);

  // Percorre os estágios enquanto a IA trabalha (indicador indeterminado).
  useEffect(() => {
    if (!generating) {
      setStageIndex(0);
      return;
    }
    const timer = setInterval(
      () => setStageIndex((i) => Math.min(i + 1, GERACAO_STAGES.length - 1)),
      4500
    );
    return () => clearInterval(timer);
  }, [generating]);

  /** Preferências ficam no servidor — enviamos apenas observação livre opcional. */
  const generatePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("meal-plan", {
        body: { goal: notes.trim() || undefined },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (!data?.plano?.length) throw new Error("O plano veio incompleto. Tente novamente.");

      setPlano(data as PlanoSemanal);
      if (data.plano?.length) setExpandedDay(data.plano[0].dia);
    } catch (e: unknown) {
      setError(await extrairErro(e));
    } finally {
      setGenerating(false);
    }
  };

  const mealKey = (dia: string, tipo: string) => `${dia}-${tipo}`;

  const swapMeal = async (dia: string, ref: Refeicao) => {
    const key = mealKey(dia, ref.tipo);
    setSwapping(key);
    try {
      // Contexto (preferências, memória) é carregado pelo backend.
      const { data, error: fnError } = await supabase.functions.invoke("meal-swap", {
        body: { refeicao: ref },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const nova = data as Refeicao & { motivo_troca?: string };
      setPlano((prev) =>
        prev
          ? {
              ...prev,
              plano: prev.plano.map((d) =>
                d.dia !== dia
                  ? d
                  : {
                      ...d,
                      refeicoes: d.refeicoes.map((r) =>
                        r.tipo === ref.tipo ? { ...nova, tipo: ref.tipo } : r
                      ),
                    }
              ),
            }
          : prev
      );
      toast({
        title: "Refeição substituída",
        description: nova.motivo_troca || `${ref.nome} → ${nova.nome}`,
      });
    } catch (e: unknown) {
      const msg = await extrairErro(e);
      toast({
        title: "Não consegui trocar a refeição",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSwapping(null);
    }
  };

  const mealTypeId = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes("café") || t.includes("cafe") || t.includes("manhã")) return "cafe";
    if (t.includes("almo")) return "almoco";
    if (t.includes("lanche")) return "lanche";
    if (t.includes("jantar") || t.includes("ceia")) return "jantar";
    return "outro";
  };

  const addToDiary = async (ref: Refeicao) => {
    if (!user) {
      toast({ title: "Faça login", description: "Entre para registrar refeições no diário." });
      return;
    }
    const { error } = await supabase.from("food_log").insert({
      user_id: user.id,
      food_name: ref.nome,
      quantity: "1 porção",
      meal_type: mealTypeId(ref.tipo),
      calories: ref.calorias || 0,
      protein: ref.proteina || 0,
      carbs: ref.carb || 0,
      fat: ref.gordura || 0,
      logged_at: todayISO(),
    });
    if (error) {
      toast({ title: "Não foi possível registrar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Adicionado ao diário", description: `${ref.nome} registrado hoje.` });
  };

  const exportPdf = async () => {
    if (!plano) return;
    const sup = plano.suplementacao;
    const hasSuplementacao = !!(sup && (sup.pre_treino || sup.intra_treino || sup.pos_treino));

    await exportPdfCompat({
      title: "Plano alimentar semanal",
      subtitle: plano.custo_estimado ? `Custo estimado: ${plano.custo_estimado}` : undefined,
      sections: [
        {
          kind: "summary",
          title: "Resumo nutricional (média diária)",
          rows: [
            {
              label: "Média diária",
              calorias: plano.resumo.calorias_media,
              proteina: plano.resumo.proteina_media,
              carb: plano.resumo.carb_media,
              gordura: plano.resumo.gordura_media,
            },
          ],
        },
        {
          title: "Hidratação sugerida ao longo do dia",
          lines: [
            ...waterSplit.map((s) => `${s.label} (~${Math.round(s.ratio * 100)}%): ${s.ml} ml`),
            `Total sugerido: ${waterSplit.reduce((sum, s) => sum + s.ml, 0)} ml/dia`,
          ],
        },
        ...plano.plano.map((dia) => ({
          kind: "meals" as const,
          title: dia.dia,
          meals: dia.refeicoes.map((r) => ({
            tipo: r.tipo,
            nome: r.nome,
            calorias: r.calorias,
            proteina: r.proteina,
            carb: r.carb,
            gordura: r.gordura,
            detalhe: r.ingredientes?.length ? `Ingredientes: ${r.ingredientes.join(", ")}` : undefined,
            alternativas: r.opcoes?.slice(1).map((o) => ({ nome: o.nome, calorias: o.calorias })),
          })),
        })),
        ...(hasSuplementacao
          ? [
              {
                kind: "supplement" as const,
                title: "Suplementação para o treino",
                preTreino: sup?.pre_treino ?? undefined,
                intraTreino: sup?.intra_treino ?? undefined,
                posTreino: sup?.pos_treino ?? undefined,
              },
            ]
          : []),
        ...(plano.lista_compras?.length
          ? [{ kind: "shopping" as const, title: "Lista de compras", items: plano.lista_compras }]
          : []),
        ...(plano.dicas?.length
          ? [{ title: "Dicas da IA", lines: plano.dicas.map((d, i) => `${i + 1}. ${d}`) }]
          : []),
      ],
      fileName: "evolua-plus-plano-semanal.pdf",
    });
  };

  const ErroCard = (
    <div
      role="alert"
      className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-center space-y-3"
    >
      <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
      <p className="font-display font-semibold text-foreground">Não conseguimos montar seu plano agora.</p>
      <p className="text-sm text-muted-foreground">{error}</p>
      <Button variant="hero" onClick={generatePlan} disabled={generating} className="gap-2">
        <RefreshCw className="w-4 h-4" /> Tentar novamente
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-10">
          <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-display text-sm font-medium">
            📅 Planejamento inteligente
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Plano <span className="text-primary">Semanal</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            A IA gera um plano completo de refeições personalizado com o seu perfil, metas e preferências
          </p>
        </div>

        {/* Erro da geração — estado na interface, não apenas toast */}
        {error && !generating && <div className="mb-6">{ErroCard}</div>}

        {!plano && (
          <div className="bg-card rounded-2xl shadow-soft p-8 text-center space-y-5">
            <Calendar className="w-12 h-12 text-primary mx-auto" />
            <p className="font-display font-semibold text-foreground">
              Gere seu plano semanal
            </p>
            <p className="text-sm text-muted-foreground">
              Vamos usar seu objetivo, restrições, alimentos preferidos e metas já salvos no seu perfil
            </p>

            {/* Objetivo único — nunca perguntamos aqui o que já está definido */}
            {objectiveInfo ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4 text-primary" />
                <span>
                  Objetivo: <strong className="text-foreground">{objectiveInfo.emoji} {objectiveInfo.label}</strong>
                </span>
                <Link to="/preferencias" className="text-primary font-medium underline">
                  alterar
                </Link>
              </div>
            ) : prefsLoading ? null : (
              <div className="rounded-xl bg-accent/10 border border-accent/30 p-4 flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Seu objetivo ainda não está definido.{" "}
                  <Link to="/preferencias" className="text-primary font-medium underline">
                    Defina em Meu Perfil
                  </Link>{" "}
                  para receber um plano bem ajustado.
                </p>
              </div>
            )}

            <div className="text-left max-w-md mx-auto">
              <label htmlFor="plan-notes" className="block text-sm font-medium text-foreground mb-1.5">
                Alguma observação extra para a IA? <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                id="plan-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: prefiro refeições práticas para levar ao trabalho, com orçamento enxuto..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
                maxLength={500}
              />
            </div>

            <Button variant="hero" size="lg" onClick={generatePlan} disabled={generating} className="gap-2">
              {generating ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Gerando plano...</>
              ) : (
                <><Calendar className="w-5 h-5" /> Gerar plano com IA</>
              )}
            </Button>

            {/* Onboarding avançado opcional — nunca obrigatório para gerar o plano padrão */}
            <div className="pt-1">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/plano-personalizado">
                  <Sparkles className="w-4 h-4" />
                  {hasRoutineProfile ? "Editar rotina personalizada" : "Criar um plano feito sob medida pra minha rotina"}
                </Link>
              </Button>
              {hasRoutineProfile && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ Sua rotina está configurada — o próximo plano gerado vai considerá-la.
                </p>
              )}
            </div>

            {/* Progresso indeterminado e honesto — nenhuma porcentagem simulada */}
            {generating && (
              <div aria-live="polite">
                <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                  <div className="h-full w-full bg-primary/60 rounded-full animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{GERACAO_STAGES[stageIndex]}</p>
              </div>
            )}
          </div>
        )}

        {plano && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">📊 Resumo semanal</h2>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="font-display font-bold text-foreground">{plano.resumo.calorias_media}</p>
                  <p className="text-xs text-muted-foreground">kcal/dia</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="font-display font-bold text-primary">{plano.resumo.proteina_media}g</p>
                  <p className="text-xs text-muted-foreground">prot/dia</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="font-display font-bold text-accent">{plano.resumo.carb_media}g</p>
                  <p className="text-xs text-muted-foreground">carb/dia</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="font-display font-bold text-foreground">{plano.resumo.gordura_media}g</p>
                  <p className="text-xs text-muted-foreground">gord/dia</p>
                </div>
              </div>
              {plano.custo_estimado && (
                <p className="text-sm text-center text-muted-foreground mt-3">
                  💰 Custo estimado: <strong className="text-primary">{plano.custo_estimado}</strong>
                </p>
              )}

              {/* Hidratação fracionada — mesma meta diária já salva, só dividida visualmente por período */}
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-primary" /> Hidratação sugerida ao longo do dia
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {waterSplit.map((s) => (
                    <div key={s.key} className="bg-secondary/50 rounded-lg p-2 text-center">
                      <p className="text-xs font-display font-bold text-foreground">{s.ml} ml</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Days */}
            {plano.plano.map((dia) => (
              <div key={dia.dia} className="bg-card rounded-2xl shadow-soft overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === dia.dia ? null : dia.dia)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
                      {dia.dia.slice(0, 3)}
                    </span>
                    <div>
                      <p className="font-display font-semibold text-foreground">{dia.dia}</p>
                      <p className="text-xs text-muted-foreground">
                        {dia.refeicoes.reduce((sum, r) => sum + (r.calorias || 0), 0)} kcal total
                      </p>
                    </div>
                  </div>
                  {expandedDay === dia.dia ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </button>

                {expandedDay === dia.dia && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                    {dia.refeicoes.map((ref) => {
                      const key = mealKey(dia.dia, ref.tipo);
                      const isExpanded = expandedMeal === key;
                      return (
                        <div key={key} className="border border-border rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedMeal(isExpanded ? null : key)}
                            className="w-full p-3 flex items-center justify-between text-left"
                          >
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">{ref.tipo}</p>
                              <p className="font-display font-semibold text-foreground text-sm">{ref.nome}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-primary font-semibold">{ref.calorias} kcal</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                              <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="bg-secondary/50 rounded-lg p-1.5">
                                  <p className="font-display font-bold text-foreground text-xs">{ref.calorias}</p>
                                  <p className="text-[10px] text-muted-foreground">kcal</p>
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-1.5">
                                  <p className="font-display font-bold text-primary text-xs">{ref.proteina}g</p>
                                  <p className="text-[10px] text-muted-foreground">prot</p>
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-1.5">
                                  <p className="font-display font-bold text-accent text-xs">{ref.carb}g</p>
                                  <p className="text-[10px] text-muted-foreground">carb</p>
                                </div>
                                <div className="bg-secondary/50 rounded-lg p-1.5">
                                  <p className="font-display font-bold text-foreground text-xs">{ref.gordura}g</p>
                                  <p className="text-[10px] text-muted-foreground">gord</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground"><strong>Ingredientes:</strong> {ref.ingredientes.join(", ")}</p>
                              </div>
                              {ref.preparo && (
                                <div>
                                  <p className="text-xs text-muted-foreground"><strong>Preparo:</strong> {ref.preparo}</p>
                                </div>
                              )}
                              {ref.opcoes && ref.opcoes.length > 1 && (
                                <p className="text-xs text-muted-foreground/80 italic">
                                  Ou troque por:{" "}
                                  {ref.opcoes.slice(1).map((o, i, arr) => (
                                    <span key={o.nome}>
                                      {o.nome} ({o.calorias} kcal)
                                      {i < arr.length - 1 ? "; " : ""}
                                    </span>
                                  ))}
                                </p>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                                onClick={() => addToDiary(ref)}
                              >
                                <Plus className="w-4 h-4" /> Adicionar ao diário
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full gap-2"
                                disabled={swapping === key}
                                onClick={() => swapMeal(dia.dia, ref)}
                              >
                                {swapping === key ? (
                                  <><RefreshCw className="w-4 h-4 animate-spin" /> Buscando outra opção...</>
                                ) : (
                                  <><Shuffle className="w-4 h-4" /> Não gostei, trocar refeição</>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Lista de compras inteligente */}
            <SmartShoppingList
              source={plano.lista_compras ?? []}
              onRegenerate={generatePlan}
              regenerating={generating}
            />

            {/* Suplementação — só existe quando o usuário treina (onboarding avançado) */}
            {plano.suplementacao && (plano.suplementacao.pre_treino || plano.suplementacao.intra_treino || plano.suplementacao.pos_treino) && (
              <div className="bg-card rounded-2xl shadow-soft border border-accent/20 p-6">
                <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-accent" /> Suplementação para o treino
                </h2>
                <div className="space-y-3">
                  {plano.suplementacao.pre_treino && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pré-treino</p>
                      <p className="text-sm text-foreground">{plano.suplementacao.pre_treino}</p>
                    </div>
                  )}
                  {plano.suplementacao.intra_treino && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intra-treino</p>
                      <p className="text-sm text-foreground">{plano.suplementacao.intra_treino}</p>
                    </div>
                  )}
                  {plano.suplementacao.pos_treino && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pós-treino</p>
                      <p className="text-sm text-foreground">{plano.suplementacao.pos_treino}</p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/60 inline-flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Sugestões educativas com alimentos comuns — não substitui acompanhamento de nutricionista ou médico.
                </p>
              </div>
            )}

            {/* Tips */}
            {plano.dicas && plano.dicas.length > 0 && (
              <div className="bg-card rounded-2xl shadow-soft p-6">
                <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-accent" /> Dicas da IA
                </h2>
                <div className="space-y-3">
                  {plano.dicas.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-display font-bold text-xs">
                        {i + 1}
                      </span>
                      <p className="text-muted-foreground">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" onClick={generatePlan} disabled={generating} className="gap-2">
                {generating ? <><RefreshCw className="w-5 h-5 animate-spin" /> Regenerando...</> : <><RefreshCw className="w-5 h-5" /> Gerar novo plano</>}
              </Button>
              <Button variant="outline" size="lg" onClick={exportPdf} className="gap-2">
                <FileDown className="w-5 h-5" /> Exportar PDF
              </Button>
            </div>
          </div>
        )}

        <div className="mt-10">
          <MotivationalQuote />
        </div>
      </div>
    </div>
  );
};

export default PlanoSemanal;
