import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, ArrowLeft, Zap, Plus, X, UtensilsCrossed, Trophy, Info, Sparkles } from "lucide-react";
import { RANGES, checkRange, firstError } from "@/lib/validation";
import { OBJECTIVES, type Objective } from "@/lib/objectives";
import { ACTIVITY_LEVELS, GLOSSARY, computeMetrics, type Metrics } from "@/lib/nutritionCalc";
import { SPORTS } from "@/data/preferencias";
import { saveDraft } from "@/lib/onboardingDraft";
import { track } from "@/lib/analytics";
import { useAuth } from "@/contexts/useAuth";

type FormData = {
  peso: string;
  altura: string;
  idade: string;
  sexo: "masculino" | "feminino" | "";
  atividade: string;
  objetivo: Objective | "";
  esportes: string[];
  refeicoesPorDia: string;
  alimentosAtuais: string[];
};

type Results = Metrics & {
  objetivo: string;
  analiseAlimentar: { pontuacao: number; dicas: string[] };
};

const alimentosComCalorias: Record<string, number> = {
  "Frango": 165, "Ovo": 155, "Carne vermelha": 250, "Peixe": 120, "Whey": 120, "Tofu": 76, "Feijão": 77,
  "Arroz": 130, "Pão": 265, "Macarrão": 131, "Batata": 77, "Aveia": 68, "Tapioca": 130, "Mandioca": 125,
  "Azeite": 884, "Castanhas": 607, "Abacate": 160, "Manteiga": 717, "Queijo": 350, "Amendoim": 567,
  "Salada": 20, "Frutas": 50, "Legumes": 35, "Iogurte": 59, "Leite": 42, "Suco": 45, "Café": 2,
  "Refrigerante": 140, "Fast food": 550, "Doces": 400, "Salgadinho": 536,
};

const alimentosSugeridos = [
  { categoria: "Proteínas", items: ["Frango", "Ovo", "Carne vermelha", "Peixe", "Whey", "Tofu", "Feijão"] },
  { categoria: "Carboidratos", items: ["Arroz", "Pão", "Macarrão", "Batata", "Aveia", "Tapioca", "Mandioca"] },
  { categoria: "Gorduras", items: ["Azeite", "Castanhas", "Abacate", "Manteiga", "Queijo", "Amendoim"] },
  { categoria: "Outros", items: ["Salada", "Frutas", "Legumes", "Iogurte", "Leite", "Suco", "Café", "Refrigerante", "Fast food", "Doces", "Salgadinho"] },
];

const mealsOptions = [
  { id: "1-2", label: "1 a 2 refeições", desc: "Poucas refeições por dia" },
  { id: "3", label: "3 refeições", desc: "Café, almoço e janta" },
  { id: "4-5", label: "4 a 5 refeições", desc: "Inclui lanches entre refeições" },
  { id: "6+", label: "6 ou mais", desc: "Refeições fracionadas ao longo do dia" },
];

const TOTAL_STEPS = 5;

const Hint = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={`O que é isso? ${text}`}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="w-4 h-4" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-[240px] text-sm">{text}</TooltipContent>
  </Tooltip>
);

const Calculator = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    peso: "", altura: "", idade: "", sexo: "", atividade: "", objetivo: "",
    esportes: [], refeicoesPorDia: "", alimentosAtuais: [],
  });
  const [novoAlimento, setNovoAlimento] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const toggleEsporte = (esporte: string) => {
    setForm((prev) => {
      if (esporte === "nenhum") {
        return { ...prev, esportes: prev.esportes.includes("nenhum") ? [] : ["nenhum"] };
      }
      const withoutNenhum = prev.esportes.filter((e) => e !== "nenhum");
      return {
        ...prev,
        esportes: withoutNenhum.includes(esporte)
          ? withoutNenhum.filter((e) => e !== esporte)
          : [...withoutNenhum, esporte],
      };
    });
  };

  const toggleAlimento = (alimento: string) => {
    setForm((prev) => ({
      ...prev,
      alimentosAtuais: prev.alimentosAtuais.includes(alimento)
        ? prev.alimentosAtuais.filter((a) => a !== alimento)
        : [...prev.alimentosAtuais, alimento],
    }));
  };

  const addCustomAlimento = () => {
    const trimmed = novoAlimento.trim().slice(0, 60);
    if (trimmed && !form.alimentosAtuais.includes(trimmed)) {
      setForm((prev) => ({ ...prev, alimentosAtuais: [...prev.alimentosAtuais, trimmed] }));
      setNovoAlimento("");
    }
  };

  const analisarAlimentacao = (): { pontuacao: number; dicas: string[] } => {
    const alimentos = form.alimentosAtuais.map((a) => a.toLowerCase());
    const dicas: string[] = [];
    let pontuacao = 50;
    const has = (list: string[]) => list.some((p) => alimentos.some((a) => a.includes(p)));

    if (has(["frango", "ovo", "carne vermelha", "peixe", "whey", "tofu", "feijão"])) pontuacao += 10;
    else dicas.push("Inclua mais fontes de proteína como frango, ovo ou feijão.");

    if (has(["salada", "legumes", "frutas"])) pontuacao += 15;
    else dicas.push("Adicione mais vegetais, frutas e saladas ao seu dia.");

    if (has(["fast food", "refrigerante", "salgadinho", "doces"])) {
      pontuacao -= 15;
      dicas.push("Reduza o consumo de ultraprocessados como fast food e refrigerante.");
    }

    if (has(["arroz", "pão", "batata", "aveia", "macarrão"])) pontuacao += 5;

    if (has(["azeite", "castanhas", "abacate", "amendoim"])) pontuacao += 10;
    else dicas.push("Inclua gorduras saudáveis como azeite, castanhas ou abacate.");

    if (form.refeicoesPorDia === "1-2") {
      pontuacao -= 10;
      dicas.push("Tente fazer ao menos 3 refeições por dia para manter o metabolismo ativo.");
    } else if (form.refeicoesPorDia === "4-5" || form.refeicoesPorDia === "6+") {
      pontuacao += 10;
    }

    if (form.alimentosAtuais.length >= 8) {
      pontuacao += 10;
      dicas.push("Boa variedade alimentar! Continue assim.");
    } else if (form.alimentosAtuais.length < 4) {
      dicas.push("Tente diversificar mais seus alimentos para garantir todos os nutrientes.");
    }

    return { pontuacao: Math.max(0, Math.min(100, pontuacao)), dicas };
  };

  const numbers = () => ({
    peso: parseFloat(form.peso.replace(",", ".")),
    altura: parseFloat(form.altura.replace(",", ".")),
    idade: parseFloat(form.idade.replace(",", ".")),
  });

  const calculate = () => {
    const { peso, altura, idade } = numbers();
    const metrics = computeMetrics({
      weightKg: peso,
      heightCm: altura,
      age: idade,
      sex: form.sexo,
      activity: form.atividade,
      objective: form.objetivo as Objective,
    });

    setResults({
      ...metrics,
      objetivo: OBJECTIVES.find((o) => o.id === form.objetivo)?.label ?? "",
      analiseAlimentar: analisarAlimentacao(),
    });
    setStep(TOTAL_STEPS);
    track("calculator_completed", { objective: form.objetivo });
  };

  /** CTA principal: leva o visitante da calculadora direto para o onboarding, sem perder dados. */
  const continueToOnboarding = () => {
    if (!results || !form.objetivo) return;
    const { peso, altura, idade } = numbers();
    saveDraft({
      objective: form.objetivo as Objective,
      weightKg: peso,
      heightCm: altura,
      age: idade,
      sex: form.sexo,
      activity: form.atividade,
      sports: form.esportes,
      metrics: {
        bmr: results.bmr, tdee: results.tdee, calories: results.calories,
        protein: results.protein, carbs: results.carbs, fat: results.fat,
      },
    });
    if (user) {
      navigate("/onboarding");
    } else {
      track("signup_started", { from: "calculator" });
      navigate("/auth?next=onboarding");
    }
  };

  const bodyDataError = firstError([
    checkRange(form.peso, RANGES.peso),
    checkRange(form.altura, RANGES.altura),
    checkRange(form.idade, RANGES.idade),
  ]);

  const canProceed = () => {
    switch (step) {
      case 0: return form.objetivo !== "";
      case 1: return bodyDataError === null;
      case 2: return form.atividade !== "" && form.esportes.length > 0;
      case 3: return form.refeicoesPorDia !== "" && form.alimentosAtuais.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => (step === 4 ? calculate() : setStep((s) => s + 1));

  return (
    <section id="calculator" className="py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-2xl">
        {step < TOTAL_STEPS && (
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Monte seu plano</h2>
            <p className="mt-3 text-muted-foreground">Responda algumas perguntas rápidas</p>
            <div className="mt-8 flex gap-2 justify-center" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step + 1} aria-label={`Etapa ${step + 1} de ${TOTAL_STEPS}`}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "w-12 bg-primary" : "w-8 bg-border"}`} />
              ))}
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl shadow-soft p-6 sm:p-10">
          {/* Etapa 0 — objetivo */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-display text-xl font-semibold text-foreground mb-6">Qual é o seu objetivo principal?</h3>
              <div className="grid gap-3">
                {OBJECTIVES.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => setForm({ ...form, objetivo: obj.id })}
                    aria-pressed={form.objetivo === obj.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      form.objetivo === obj.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">{obj.emoji}</span>
                    <div>
                      <p className="font-display font-semibold text-foreground">{obj.label}</p>
                      <p className="text-sm text-muted-foreground">{obj.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 1 — dados corporais */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="font-display text-xl font-semibold text-foreground mb-6">Seus dados corporais</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { key: "peso", label: "Peso (kg)", placeholder: "72" },
                  { key: "altura", label: "Altura (cm)", placeholder: "175" },
                  { key: "idade", label: "Idade", placeholder: "28" },
                ].map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`calc-${field.key}`} className="block text-sm font-medium text-muted-foreground mb-2">
                      {field.label}
                    </label>
                    <input
                      id={`calc-${field.key}`}
                      type="number"
                      inputMode="decimal"
                      placeholder={field.placeholder}
                      min={0}
                      aria-invalid={!!bodyDataError}
                      aria-describedby={bodyDataError ? "calc-body-error" : undefined}
                      value={form[field.key as keyof FormData] as string}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border-2 border-border bg-background text-foreground font-display text-lg focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    />
                  </div>
                ))}
              </div>
              {bodyDataError && form.peso !== "" && form.altura !== "" && form.idade !== "" && (
                <p id="calc-body-error" role="alert" className="text-sm text-destructive -mt-3">{bodyDataError}</p>
              )}
              <fieldset>
                <legend className="block text-sm font-medium text-muted-foreground mb-3">
                  Sexo <span className="text-xs">(opcional)</span>
                </legend>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "masculino" as const, label: "Masculino" },
                    { id: "feminino" as const, label: "Feminino" },
                    { id: "" as const, label: "Prefiro não dizer" },
                  ].map((opt) => (
                    <button
                      key={opt.id || "neutro"}
                      onClick={() => setForm({ ...form, sexo: opt.id })}
                      aria-pressed={form.sexo === opt.id}
                      className={`flex-1 min-w-[120px] py-3 rounded-xl border-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        form.sexo === opt.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {/* Etapa 2 — atividade e esportes */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="font-display text-xl font-semibold text-foreground mb-6">Nível de atividade física</h3>
              <div className="grid gap-3">
                {ACTIVITY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setForm({ ...form, atividade: level.id })}
                    aria-pressed={form.atividade === level.id}
                    className={`p-4 rounded-xl border-2 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      form.atividade === level.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="font-display font-semibold text-foreground">{level.label}</p>
                    <p className="text-sm text-muted-foreground">{level.desc}</p>
                  </button>
                ))}
              </div>

              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Trophy className="w-4 h-4 text-primary" />
                  Qual esporte você pratica? <span className="text-xs">(pode selecionar vários)</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SPORTS.map((esporte) => (
                    <button
                      key={esporte.id}
                      onClick={() => toggleEsporte(esporte.id)}
                      aria-pressed={form.esportes.includes(esporte.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left text-sm min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        form.esportes.includes(esporte.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <span className="text-lg" aria-hidden="true">{esporte.icon}</span>
                      <span className="font-medium text-foreground">{esporte.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 3 — alimentação atual */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                <UtensilsCrossed className="w-5 h-5 inline-block mr-2 text-primary" />
                Sua alimentação atual
              </h3>
              <p className="text-sm text-muted-foreground -mt-4">Nos conte o que você costuma comer no dia a dia</p>

              <div>
                <p className="block text-sm font-medium text-muted-foreground mb-3">Quantas refeições você faz por dia?</p>
                <div className="grid grid-cols-2 gap-3">
                  {mealsOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setForm({ ...form, refeicoesPorDia: opt.id })}
                      aria-pressed={form.refeicoesPorDia === opt.id}
                      className={`p-3 rounded-xl border-2 transition-all text-left min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        form.refeicoesPorDia === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <p className="font-display font-semibold text-foreground text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="calc-novo-alimento" className="block text-sm font-medium text-muted-foreground mb-3">
                  O que você costuma comer? <span className="text-xs">(selecione ou adicione)</span>
                </label>

                {form.alimentosAtuais.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {form.alimentosAtuais.map((alimento) => (
                      <span key={alimento} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {alimento}
                        {alimentosComCalorias[alimento] ? <span className="opacity-70 text-xs">({alimentosComCalorias[alimento]}cal)</span> : null}
                        <button onClick={() => toggleAlimento(alimento)} aria-label={`Remover ${alimento}`} className="ml-1 hover:text-destructive transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <input
                    id="calc-novo-alimento"
                    type="text"
                    placeholder="Adicionar outro alimento..."
                    value={novoAlimento}
                    maxLength={60}
                    onChange={(e) => setNovoAlimento(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomAlimento()}
                    className="flex-1 h-11 px-4 rounded-xl border-2 border-border bg-background text-foreground text-sm focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                  <Button variant="outline" size="sm" onClick={addCustomAlimento} disabled={!novoAlimento.trim()} aria-label="Adicionar alimento" className="h-11 px-4">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                  {alimentosSugeridos.map((cat) => (
                    <div key={cat.categoria}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.categoria}</p>
                      <div className="flex flex-wrap gap-2">
                        {cat.items.map((item) => (
                          <button
                            key={item}
                            onClick={() => toggleAlimento(item)}
                            aria-pressed={form.alimentosAtuais.includes(item)}
                            className={`px-3 py-2 rounded-full text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              form.alimentosAtuais.includes(item) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {item} <span className="opacity-70 text-xs">({alimentosComCalorias[item]}cal)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 4 — confirmação */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in text-center">
              <h3 className="font-display text-xl font-semibold text-foreground">Tudo pronto!</h3>
              <p className="text-muted-foreground">
                Vamos estimar seu plano nutricional com base nas suas informações.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
                <span className="text-muted-foreground text-sm">Peso:</span>
                <span className="font-medium text-foreground text-sm">{form.peso} kg</span>
                <span className="text-muted-foreground text-sm">Altura:</span>
                <span className="font-medium text-foreground text-sm">{form.altura} cm</span>
                <span className="text-muted-foreground text-sm">Idade:</span>
                <span className="font-medium text-foreground text-sm">{form.idade} anos</span>
                <span className="text-muted-foreground text-sm">Objetivo:</span>
                <span className="font-medium text-foreground text-sm">{OBJECTIVES.find((o) => o.id === form.objetivo)?.label}</span>
                <span className="text-muted-foreground text-sm">Esporte(s):</span>
                <span className="font-medium text-foreground text-sm">
                  {form.esportes.map((e) => SPORTS.find((s) => s.id === e)?.label).join(", ")}
                </span>
                <span className="text-muted-foreground text-sm">Refeições/dia:</span>
                <span className="font-medium text-foreground text-sm">{mealsOptions.find((m) => m.id === form.refeicoesPorDia)?.label}</span>
                <span className="text-muted-foreground text-sm">Alimentos:</span>
                <span className="font-medium text-foreground text-sm">{form.alimentosAtuais.length} selecionados</span>
              </div>
            </div>
          )}

          {/* Etapa 5 — resultado */}
          {step === TOTAL_STEPS && results && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-display text-sm font-medium mb-4">
                  <Zap className="w-4 h-4" /> Suas estimativas
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground">Resultado personalizado</h3>
                <p className="text-muted-foreground mt-1">Objetivo: {results.objetivo}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <ResultCard label="Taxa Metabólica Basal (TMB)" value={`${results.bmr}`} unit="kcal" hint={GLOSSARY.tmb} />
                <ResultCard label="Gasto Diário Total (TDEE)" value={`${results.tdee}`} unit="kcal" hint={GLOSSARY.tdee} />
              </div>

              <div className="bg-primary/5 rounded-xl p-6 mb-6 text-center">
                <p className="text-sm text-muted-foreground font-medium">Meta calórica diária estimada</p>
                <p className="font-display text-4xl font-bold text-primary mt-1">
                  {results.calories}
                  <span className="text-lg font-normal text-muted-foreground ml-1">kcal</span>
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 mb-3">
                <p className="text-sm font-medium text-muted-foreground">Macros</p>
                <Hint text={GLOSSARY.macros} />
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <MacroCard label="Proteína" value={results.protein} unit="g" color="bg-primary" />
                <MacroCard label="Carboidrato" value={results.carbs} unit="g" color="bg-accent" />
                <MacroCard label="Gordura" value={results.fat} unit="g" color="bg-secondary" />
              </div>

              <div className="bg-secondary/50 rounded-xl p-6 mb-6">
                <h4 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-primary" /> Análise da sua alimentação
                </h4>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Pontuação alimentar</span>
                    <span className={`font-display font-bold ${
                      results.analiseAlimentar.pontuacao >= 70 ? "text-primary" :
                      results.analiseAlimentar.pontuacao >= 40 ? "text-accent-foreground" : "text-destructive"
                    }`}>
                      {results.analiseAlimentar.pontuacao}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        results.analiseAlimentar.pontuacao >= 70 ? "bg-primary" :
                        results.analiseAlimentar.pontuacao >= 40 ? "bg-accent" : "bg-destructive"
                      }`}
                      style={{ width: `${results.analiseAlimentar.pontuacao}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {results.analiseAlimentar.dicas.map((dica, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5" aria-hidden="true">•</span>
                      <span className="text-muted-foreground">{dica}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA principal — leva ao onboarding preservando tudo */}
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center">
                <h4 className="font-display text-lg font-semibold text-foreground">
                  Quer transformar isso em um plano de verdade?
                </h4>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Salvamos tudo o que você preencheu e montamos seu primeiro cardápio da semana.
                </p>
                <Button variant="hero" size="lg" className="w-full sm:w-auto gap-2" onClick={continueToOnboarding}>
                  <Sparkles className="w-5 h-5" /> Salvar meus resultados e continuar
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Estimativas educacionais. Não substitui acompanhamento de nutricionista ou médico.
                </p>
              </div>

              <div className="mt-6 text-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep(0);
                    setResults(null);
                    setForm({ peso: "", altura: "", idade: "", sexo: "", atividade: "", objetivo: "", esportes: [], refeicoesPorDia: "", alimentosAtuais: [] });
                  }}
                >
                  Recalcular
                </Button>
              </div>
            </div>
          )}

          {step < TOTAL_STEPS && (
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button variant="hero" onClick={nextStep} disabled={!canProceed()} className="gap-2">
                {step === 4 ? "Ver resultado" : "Próximo"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const ResultCard = ({ label, value, unit, hint }: { label: string; value: string; unit: string; hint: string }) => (
  <div className="bg-secondary/50 rounded-xl p-5">
    <div className="flex items-center gap-1">
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <Hint text={hint} />
    </div>
    <p className="font-display text-2xl font-bold text-foreground mt-1">
      {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
    </p>
    <p className="text-xs text-muted-foreground mt-1">Valor estimado</p>
  </div>
);

const MacroCard = ({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) => (
  <div className="text-center p-4 rounded-xl bg-secondary/50">
    <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-2`} aria-hidden="true" />
    <p className="font-display text-xl font-bold text-foreground">{value}{unit}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

export default Calculator;
