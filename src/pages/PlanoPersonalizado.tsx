import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Bot, Check, Clock, Droplet, Loader2 } from "lucide-react";
import { SPORTS } from "@/data/preferencias";
import { useRoutineProfile, usePersistRoutineProfile, emptyRoutineProfile, type MealKey, type RoutineProfileData } from "@/hooks/useRoutineProfile";
import { track } from "@/lib/analytics";

const TOTAL = 4;

const MEALS: { key: MealKey; label: string }[] = [
  { key: "cafe", label: "Café da manhã" },
  { key: "almoco", label: "Almoço" },
  { key: "lanche", label: "Lanche" },
  { key: "jantar", label: "Jantar" },
];

const TRAINING_FREQUENCIES = ["1-2x por semana", "3-4x por semana", "5+ vezes por semana"];
const TRAINING_PERIODS = ["Manhã", "Tarde", "Noite", "Varia"];
const BUSY_PERIODS = [
  { id: "manha", label: "Manhã" },
  { id: "tarde", label: "Tarde" },
  { id: "noite", label: "Noite" },
  { id: "madrugada", label: "Madrugada" },
];

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`px-4 py-2.5 rounded-full text-sm min-h-11 transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-foreground border-border hover:border-primary/50"
    }`}
  >
    {children}
  </button>
);

/** Aviso de IA — obrigatório em pelo menos 2 telas visíveis deste fluxo (início e resumo). */
const AiDisclaimer = ({ compact }: { compact?: boolean }) => (
  <Alert className="border-primary/30 bg-primary/5">
    <Bot className="h-4 w-4 text-primary" />
    <AlertDescription className="text-foreground/90">
      {compact
        ? "Lembrete: o plano final continua sendo gerado por inteligência artificial — não é orientação de nutricionista, médico ou profissional de saúde, e não substitui acompanhamento profissional."
        : "Este questionário e o plano gerado a partir dele são produzidos por inteligência artificial (Evolua Plus AI). Não é nutricionista, médico nem qualquer profissional de saúde, e não substitui acompanhamento profissional. Os valores e sugestões são estimativas educacionais."}
    </AlertDescription>
  </Alert>
);

const PlanoPersonalizado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existing } = useRoutineProfile();
  const persist = usePersistRoutineProfile();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<RoutineProfileData>(emptyRoutineProfile);

  useEffect(() => {
    track("routine_profile_started");
  }, []);

  useEffect(() => {
    if (hydrated || !existing) return;
    setForm(existing.value);
    setHydrated(true);
  }, [existing, hydrated]);

  const setMealTime = (key: MealKey, value: string) =>
    setForm((f) => ({ ...f, mealTimes: { ...f.mealTimes, [key]: value } }));
  const setUsualMeal = (key: MealKey, value: string) =>
    setForm((f) => ({ ...f, usualMeals: { ...f.usualMeals, [key]: value } }));

  const goNext = () => {
    setStep((s) => Math.min(TOTAL, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = async () => {
    setSaving(true);
    try {
      await persist(form, true);
      track("routine_profile_completed");
      toast({
        title: "Rotina salva! 🎉",
        description: "Seu próximo plano semanal já vai considerar esses detalhes.",
      });
      navigate("/plano-semanal", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: "Não conseguimos salvar",
        description: msg || "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-x-hidden">
      <div className="w-full max-w-2xl mx-auto px-5">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
              Etapa {step} de {TOTAL}
            </p>
            <div className="flex gap-1.5" role="list">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  role="listitem"
                  aria-current={i === step ? "step" : undefined}
                  className={`h-2 rounded-full transition-all ${
                    i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/50" : "w-4 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {step === 1 && (
          <section className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Plano feito sob medida pra sua rotina</h1>
              <p className="mt-2 text-muted-foreground">
                Responda o que fizer sentido — tudo aqui é opcional e ajuda a IA a montar horários e receitas mais realistas.
              </p>
            </header>

            <AiDisclaimer />

            <div className="bg-card rounded-2xl shadow-soft p-5 space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Horários habituais das refeições
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  {MEALS.map((m) => (
                    <div key={m.key} className="space-y-2">
                      <Label htmlFor={`time-${m.key}`}>{m.label}</Label>
                      <Input
                        id={`time-${m.key}`}
                        type="time"
                        className="h-12"
                        value={form.mealTimes[m.key]}
                        onChange={(e) => setMealTime(m.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">O que você costuma comer hoje?</h1>
              <p className="mt-2 text-muted-foreground">
                Conte livremente — a IA usa isso como referência, não como regra fixa.
              </p>
            </header>

            <div className="bg-card rounded-2xl shadow-soft p-5 space-y-5">
              {MEALS.map((m) => (
                <div key={m.key} className="space-y-2">
                  <Label htmlFor={`usual-${m.key}`}>{m.label}</Label>
                  <Textarea
                    id={`usual-${m.key}`}
                    value={form.usualMeals[m.key]}
                    onChange={(e) => setUsualMeal(m.key, e.target.value)}
                    placeholder="Ex: pão com ovo e café com leite"
                    maxLength={200}
                    className="min-h-[70px]"
                  />
                </div>
              ))}

              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="water" className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-primary" /> Quantos ml de água você costuma beber por dia?
                </Label>
                <Input
                  id="water"
                  inputMode="numeric"
                  className="h-12"
                  placeholder="Ex: 2000"
                  value={form.waterMl}
                  onChange={(e) => setForm((f) => ({ ...f, waterMl: e.target.value.replace(/[^\d]/g, "") }))}
                />
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Treino e rotina do dia a dia</h1>
              <p className="mt-2 text-muted-foreground">Isso ajuda a IA a encaixar as refeições no seu tempo real.</p>
            </header>

            <div className="bg-card rounded-2xl shadow-soft p-5 space-y-6">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground mb-2">Você treina atualmente?</legend>
                <div className="flex gap-2">
                  <Chip active={form.trains} onClick={() => setForm((f) => ({ ...f, trains: true }))}>
                    Sim
                  </Chip>
                  <Chip active={!form.trains} onClick={() => setForm((f) => ({ ...f, trains: false }))}>
                    Não
                  </Chip>
                </div>
              </fieldset>

              {form.trains && (
                <>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-foreground mb-2">O quê?</legend>
                    <div className="flex flex-wrap gap-2">
                      {SPORTS.filter((s) => s.id !== "nenhum").map((s) => (
                        <Chip
                          key={s.id}
                          active={form.sports.includes(s.id)}
                          onClick={() => setForm((f) => ({ ...f, sports: toggle(f.sports, s.id) }))}
                        >
                          {s.icon} {s.label}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-foreground mb-2">Com que frequência?</legend>
                    <div className="flex flex-wrap gap-2">
                      {TRAINING_FREQUENCIES.map((f) => (
                        <Chip
                          key={f}
                          active={form.trainingFrequency === f}
                          onClick={() => setForm((prev) => ({ ...prev, trainingFrequency: f }))}
                        >
                          {f}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-foreground mb-2">Em qual período?</legend>
                    <div className="flex flex-wrap gap-2">
                      {TRAINING_PERIODS.map((p) => (
                        <Chip
                          key={p}
                          active={form.trainingPeriod === p}
                          onClick={() => setForm((prev) => ({ ...prev, trainingPeriod: p }))}
                        >
                          {p}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              <fieldset className="space-y-2 pt-2 border-t border-border">
                <legend className="text-sm font-medium text-foreground mb-2">
                  Quais períodos do dia costumam estar ocupados com trabalho/estudo?
                </legend>
                <div className="flex flex-wrap gap-2">
                  {BUSY_PERIODS.map((p) => (
                    <Chip
                      key={p.id}
                      active={form.busyPeriods.includes(p.id)}
                      onClick={() => setForm((f) => ({ ...f, busyPeriods: toggle(f.busyPeriods, p.id) }))}
                    >
                      {p.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground mb-2">Você tem pouco tempo pra cozinhar?</legend>
                <div className="flex gap-2">
                  <Chip active={form.littleTimeToCook} onClick={() => setForm((f) => ({ ...f, littleTimeToCook: true }))}>
                    Sim
                  </Chip>
                  <Chip active={!form.littleTimeToCook} onClick={() => setForm((f) => ({ ...f, littleTimeToCook: false }))}>
                    Não
                  </Chip>
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="routine-notes">Quer contar mais alguma coisa sobre sua rotina? (opcional)</Label>
                <Textarea
                  id="routine-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Ex: viajo bastante a trabalho, só cozinho nos fins de semana..."
                  maxLength={500}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Confira antes de salvar</h1>
              <p className="mt-2 text-muted-foreground">Isso será usado para ajustar o seu próximo plano semanal.</p>
            </header>

            <AiDisclaimer compact />

            <div className="bg-card rounded-2xl shadow-soft p-5 space-y-4 text-sm">
              {MEALS.some((m) => form.mealTimes[m.key] || form.usualMeals[m.key]) && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Refeições</p>
                  <ul className="space-y-1">
                    {MEALS.filter((m) => form.mealTimes[m.key] || form.usualMeals[m.key]).map((m) => (
                      <li key={m.key} className="text-foreground">
                        <span className="font-medium">{m.label}</span>
                        {form.mealTimes[m.key] ? ` às ${form.mealTimes[m.key]}` : ""}
                        {form.usualMeals[m.key] ? ` — ${form.usualMeals[m.key]}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {form.waterMl && (
                <p>
                  <span className="text-muted-foreground">Água por dia:</span>{" "}
                  <span className="font-medium text-foreground">{form.waterMl} ml</span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Treino:</span>{" "}
                <span className="font-medium text-foreground">
                  {form.trains
                    ? [
                        form.sports.map((id) => SPORTS.find((s) => s.id === id)?.label ?? id).join(", "),
                        form.trainingFrequency,
                        form.trainingPeriod,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sim"
                    : "Não treina no momento"}
                </span>
              </p>
              {form.busyPeriods.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Rotina ocupada:</span>{" "}
                  <span className="font-medium text-foreground">
                    {form.busyPeriods.map((id) => BUSY_PERIODS.find((p) => p.id === id)?.label ?? id).join(", ")}
                  </span>
                </p>
              )}
              {form.littleTimeToCook && (
                <p className="text-foreground">Pouco tempo disponível para cozinhar.</p>
              )}
              {form.notes && (
                <p>
                  <span className="text-muted-foreground">Observações:</span>{" "}
                  <span className="text-foreground">{form.notes}</span>
                </p>
              )}
            </div>
          </section>
        )}

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <Button variant="outline" size="lg" className="gap-2 min-h-12" onClick={goBack} disabled={saving}>
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          {step < TOTAL ? (
            <Button variant="hero" size="lg" className="flex-1 gap-2 min-h-12" onClick={goNext}>
              Continuar
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="hero" size="lg" className="flex-1 gap-2 min-h-12" onClick={finish} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar e voltar pro plano"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanoPersonalizado;
