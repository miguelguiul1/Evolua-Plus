import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { OBJECTIVES, objectiveLabel, type Objective } from "@/lib/objectives";
import { ACTIVITY_LEVELS, computeMetrics, activityLabel } from "@/lib/nutritionCalc";
import { ALL_FOODS, RESTRICTIONS, SPORTS } from "@/data/preferencias";
import { clearDraft, loadDraft } from "@/lib/onboardingDraft";
import { useSetupStatus, usePersistOnboarding } from "@/hooks/useOnboarding";
import { track } from "@/lib/analytics";

const TOTAL = 3;

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

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: setup } = useSetupStatus();
  const persist = usePersistOnboarding();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [objective, setObjective] = useState<Objective | "">("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"masculino" | "feminino" | "">("");
  const [activity, setActivity] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  /** Pré-preenche a partir do rascunho da calculadora e, em seguida, do que já existe no perfil. */
  useEffect(() => {
    if (hydrated) return;
    const d = loadDraft();
    if (d) {
      setObjective(d.objective);
      setWeightKg(String(d.weightKg));
      setHeightCm(String(d.heightCm));
      setAge(String(d.age));
      setSex(d.sex);
      setActivity(d.activity);
      setSports(d.sports ?? []);
    }
    if (setup) {
      const p = setup.profile;
      if (!d) {
        if (setup.objective) setObjective(setup.objective);
        if (p?.height_cm) setHeightCm(String(p.height_cm));
        if (p?.age) setAge(String(p.age));
        if (p?.sex === "masculino" || p?.sex === "feminino") setSex(p.sex);
        if (p?.activity_level) setActivity(p.activity_level);
        if (p?.sports?.length) setSports(p.sports);
        if (setup.lastWeight) setWeightKg(String(setup.lastWeight));
      }
      const prefs = setup.prefs as
        | { liked_foods?: string[] | null; disliked_foods?: string[] | null; restrictions?: string[] | null }
        | null;
      if (prefs) {
        setLiked(prefs.liked_foods ?? []);
        setDisliked(prefs.disliked_foods ?? []);
        setRestrictions(prefs.restrictions ?? []);
      }
      setHydrated(true);
    }
  }, [setup, hydrated]);

  const nums = {
    weight: Number(weightKg.replace(",", ".")),
    height: Number(heightCm.replace(",", ".")),
    age: Number(age),
  };

  const validateStep1 = () => {
    const e: string[] = [];
    if (!objective) e.push("Escolha o seu objetivo.");
    if (!(nums.weight >= 30 && nums.weight <= 400)) e.push("Informe um peso entre 30 e 400 kg.");
    if (!(nums.height >= 100 && nums.height <= 250)) e.push("Informe uma altura entre 100 e 250 cm.");
    // Termos de Uso: app para maiores de 18. Dados de saúde de menores exigiriam consentimento
    // de um responsável (LGPD art. 14), que o app não coleta.
    if (!(Number.isInteger(nums.age) && nums.age >= 18 && nums.age <= 110))
      e.push("O Evolua Plus é para maiores de 18 anos. Informe uma idade entre 18 e 110 anos.");
    if (!ACTIVITY_LEVELS.some((a) => a.id === activity)) e.push("Selecione o seu nível de atividade.");
    setErrors(e);
    return e.length === 0;
  };

  const metrics = useMemo(
    () =>
      objective && nums.weight && nums.height && nums.age
        ? computeMetrics({
            weightKg: nums.weight,
            heightCm: nums.height,
            age: nums.age,
            sex,
            activity,
            objective,
          })
        : null,
    [objective, nums.weight, nums.height, nums.age, sex, activity]
  );

  const waterMl = nums.weight ? Math.round((nums.weight * 35) / 50) * 50 : 2500;

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setErrors([]);
    setStep((s) => Math.min(TOTAL, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors([]);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = async () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!metrics || !objective) return;
    setSaving(true);
    try {
      await persist({
        objective,
        weightKg: nums.weight,
        heightCm: nums.height,
        age: nums.age,
        sex,
        activity,
        sports,
        metrics,
        liked,
        disliked,
        restrictions,
        complete: true,
      });
      clearDraft();
      track("onboarding_completed", { objective });
      toast({ title: "Perfil pronto! 🎉", description: "Seu plano já pode ser montado no painel." });
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: "Não conseguimos salvar",
        description: msg || "Verifique sua conexão e tente novamente. Seus dados foram preservados.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-[calc(6rem+env(safe-area-inset-bottom))] overflow-x-hidden">
      <div className="w-full max-w-2xl mx-auto px-5">
        {/* Progresso */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
              Etapa {step} de {TOTAL}
            </p>
            <div className="flex gap-1.5" role="list">
              {[1, 2, 3].map((i) => (
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

        {errors.length > 0 && (
          <div role="alert" className="mb-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <ul className="text-sm text-destructive space-y-1">
              {errors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <section className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Confirme seu perfil</h1>
              <p className="mt-2 text-muted-foreground">
                Usamos esses dados para estimar suas metas. Você pode editar tudo agora.
              </p>
            </header>

            <div className="bg-card rounded-2xl shadow-soft p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-weight">Peso (kg)</Label>
                  <Input id="ob-weight" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-height">Altura (cm)</Label>
                  <Input id="ob-height" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-age">Idade</Label>
                  <Input id="ob-age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className="h-12" />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground mb-2">Sexo (opcional)</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "masculino", label: "Masculino" },
                    { id: "feminino", label: "Feminino" },
                    { id: "", label: "Prefiro não informar" },
                  ].map((o) => (
                    <Chip key={o.label} active={sex === o.id} onClick={() => setSex(o.id as typeof sex)}>
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground mb-2">Nível de atividade</legend>
                <div className="grid gap-2">
                  {ACTIVITY_LEVELS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={activity === a.id}
                      onClick={() => setActivity(a.id)}
                      className={`text-left p-4 rounded-xl border min-h-14 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        activity === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium text-foreground">{a.label}</span>
                      <span className="block text-sm text-muted-foreground">{a.desc}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground mb-2">Objetivo</legend>
                <div className="grid gap-2">
                  {OBJECTIVES.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={objective === o.id}
                      onClick={() => setObjective(o.id)}
                      className={`text-left p-4 rounded-xl border min-h-14 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        objective === o.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium text-foreground">
                        {o.emoji} {o.label}
                      </span>
                      <span className="block text-sm text-muted-foreground">{o.desc}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground mb-2">Esportes (opcional)</legend>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map((s) => (
                    <Chip key={s.id} active={sports.includes(s.id)} onClick={() => setSports(toggle(sports, s.id))}>
                      {s.icon} {s.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Preferências alimentares</h1>
              <p className="mt-2 text-muted-foreground">Tudo aqui é opcional — ajuda a IA a montar um plano que você realmente come.</p>
            </header>

            <div className="bg-card rounded-2xl shadow-soft p-5 space-y-6">
              <fieldset>
                <legend className="text-sm font-medium text-foreground mb-2">Restrições e alergias</legend>
                <div className="flex flex-wrap gap-2">
                  {RESTRICTIONS.map((r) => (
                    <Chip key={r} active={restrictions.includes(r)} onClick={() => setRestrictions(toggle(restrictions, r))}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              {(["liked", "disliked"] as const).map((kind) => (
                <fieldset key={kind}>
                  <legend className="text-sm font-medium text-foreground mb-2">
                    {kind === "liked" ? "Alimentos que você gosta" : "Alimentos que você não gosta"}
                  </legend>
                  <div className="space-y-4">
                    {Object.entries(ALL_FOODS).map(([cat, foods]) => (
                      <div key={cat}>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{cat}</p>
                        <div className="flex flex-wrap gap-2">
                          {foods.map((f) => {
                            const list = kind === "liked" ? liked : disliked;
                            const set = kind === "liked" ? setLiked : setDisliked;
                            const other = kind === "liked" ? disliked : liked;
                            const setOther = kind === "liked" ? setDisliked : setLiked;
                            return (
                              <Chip
                                key={f}
                                active={list.includes(f)}
                                onClick={() => {
                                  set(toggle(list, f));
                                  if (other.includes(f)) setOther(other.filter((v) => v !== f));
                                }}
                              >
                                {f}
                              </Chip>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <header>
              <h1 className="font-display text-3xl font-bold text-foreground">Seu perfil está pronto.</h1>
              <p className="mt-2 text-muted-foreground">
                Estimativas educacionais — não substituem acompanhamento profissional.
              </p>
            </header>

            <div className="bg-card rounded-2xl shadow-soft p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Objetivo</p>
                  <p className="font-semibold text-foreground">{objectiveLabel(objective)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Atividade</p>
                  <p className="font-semibold text-foreground">{activityLabel(activity)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Meta calórica</p>
                  <p className="font-semibold text-foreground">{metrics?.calories ?? "—"} kcal/dia</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Proteína</p>
                  <p className="font-semibold text-foreground">{metrics?.protein ?? "—"} g/dia</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hidratação</p>
                  <p className="font-semibold text-foreground">{(waterMl / 1000).toFixed(1)} L/dia</p>
                </div>
              </div>

              {(restrictions.length > 0 || liked.length > 0 || disliked.length > 0) && (
                <div className="pt-2 border-t border-border space-y-2 text-sm">
                  {restrictions.length > 0 && (
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">Restrições:</span> {restrictions.join(", ")}
                    </p>
                  )}
                  {liked.length > 0 && (
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">Gosta:</span> {liked.slice(0, 8).join(", ")}
                      {liked.length > 8 ? "…" : ""}
                    </p>
                  )}
                  {disliked.length > 0 && (
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">Evita:</span> {disliked.slice(0, 8).join(", ")}
                      {disliked.length > 8 ? "…" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Navegação */}
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
              {saving ? "Salvando..." : "Montar meu plano"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
