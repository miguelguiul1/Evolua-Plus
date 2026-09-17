import { useState, useRef, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera, Upload, RefreshCw, Sparkles, ChevronRight, ArrowLeft, Check,
  Flame, Beef, Wheat, Droplets, Leaf, Plus, Bookmark, GitCompare, Salad, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MEAL_TYPES, todayISO, useSyncModules } from "@/hooks/useNutrition";
import { compressImage } from "@/lib/compressImage";
import { RANGES, checkRange, firstError } from "@/lib/validation";
import CameraCapture from "@/components/CameraCapture";

interface Macros {
  calorias: number; proteina: number; carboidratos: number; gorduras: number; fibras: number; acucares?: number;
}
interface Micros {
  vitamina_c_mg?: number; calcio_mg?: number; ferro_mg?: number; potassio_mg?: number; magnesio_mg?: number; sodio_mg?: number;
}
export interface ScannedFood {
  nome: string;
  emoji?: string;
  categoria: string;
  marca?: string | null;
  tipo_produto?: string;
  confianca: number;
  porcao_base: string;
  porcao_base_g: number;
  quantidade_estimada?: string;
  ingredientes_visiveis?: string[];
  macros: Macros;
  micros?: Micros;
  alternativas?: { nome: string; motivo: string }[];
  analise_objetivo?: string;
  possiveis_identificacoes?: { nome: string; confianca: number }[];
}

const objetivos = [
  { id: "emagrecimento", label: "Emagrecer" },
  { id: "ganho de massa muscular", label: "Ganhar massa" },
  { id: "alimentação equilibrada", label: "Equilíbrio" },
];

const stages = ["Analisando alimento...", "Identificando nutrientes...", "Preparando sua análise..."];

const round = (n: number) => Math.round((n || 0) * 10) / 10;

const validateNutrition = (calories: number, protein: number, carbs: number, fat: number, fiber: number): string | null =>
  firstError([
    checkRange(calories, RANGES.calorias),
    checkRange(protein, RANGES.macro),
    checkRange(carbs, RANGES.macro),
    checkRange(fat, RANGES.macro),
    checkRange(fiber, RANGES.macro),
  ]);

const FoodScanner = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const sync = useSyncModules();
  const fileRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const [foods, setFoods] = useState<ScannedFood[] | null>(null);
  const [selected, setSelected] = useState<ScannedFood | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [objetivo, setObjetivo] = useState("alimentação equilibrada");
  const [portion, setPortion] = useState(100);
  const [customPortion, setCustomPortion] = useState("");
  const [compareWith, setCompareWith] = useState<ScannedFood | null>(null);
  const [saving, setSaving] = useState(false);
  const [mealType, setMealType] = useState<string>("outro");
  const [checked, setChecked] = useState<number[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    if (!analyzing) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => (s + 1) % stages.length), 1800);
    return () => clearInterval(t);
  }, [analyzing]);

  const pickFile = async (file: File) => {
    if (!/image\/(jpeg|jpg|png|webp)/i.test(file.type)) {
      toast({ title: "Formato não suportado", description: "Use JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 15_000_000) {
      toast({ title: "Imagem muito grande", description: "Envie uma foto de até 15MB.", variant: "destructive" });
      return;
    }
    let compressed: string;
    try {
      compressed = await compressImage(file);
    } catch {
      toast({ title: "Não consegui ler a imagem", description: "Arquivo corrompido ou inválido. Tente outra foto.", variant: "destructive" });
      return;
    }
    setImage(compressed);
    setFoods(null);
    setSelected(null);
    setErrorMsg(null);
  };

  const analyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("food-scan", {
        body: { imageBase64: image, objetivo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.sucesso === false || !data?.alimentos?.length) {
        setErrorMsg(
          data?.erro ||
            "Não consegui identificar esse alimento com segurança. Tente tirar uma foto mais próxima ou com melhor iluminação."
        );
        return;
      }
      const list = data.alimentos as ScannedFood[];
      setFoods(list);
      setChecked(list.map((_, i) => i));
      if (list.length === 1) openFood(list[0]);
      if (user) {
        await supabase.from("scan_history").insert({ user_id: user.id, result: data });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : undefined;
      toast({ title: "Erro na análise", description: message || "Tente novamente.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const openFood = (f: ScannedFood) => {
    setSelected(f);
    setPortion(f.porcao_base_g || 100);
    setCustomPortion("");
  };

  const reset = () => {
    setImage(null);
    setFoods(null);
    setSelected(null);
    setErrorMsg(null);
    setCompareWith(null);
    setChecked([]);
  };

  const factor = selected ? portion / (selected.porcao_base_g || 100) : 1;
  const scaled = (v?: number) => round((v || 0) * factor);

  const addToDiary = async () => {
    if (!selected) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    const invalid = validateNutrition(
      scaled(selected.macros.calorias),
      scaled(selected.macros.proteina),
      scaled(selected.macros.carboidratos),
      scaled(selected.macros.gorduras),
      scaled(selected.macros.fibras),
    );
    if (invalid) {
      toast({ title: "Dados nutricionais inválidos", description: invalid, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("food_log").insert({
      user_id: user.id,
      food_name: selected.nome,
      quantity: `${portion}g`,
      meal_type: mealType,
      logged_at: todayISO(),
      calories: scaled(selected.macros.calorias),
      protein: scaled(selected.macros.proteina),
      carbs: scaled(selected.macros.carboidratos),
      fat: scaled(selected.macros.gorduras),
      fiber: scaled(selected.macros.fibras),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    sync(["food"]);
    toast({ title: "Alimento adicionado ao diário.", description: `${selected.nome} · ${portion}g` });
  };

  const addSelectedToDiary = async () => {
    if (!foods || !checked.length) return;
    if (!user) return navigate("/auth");
    setBulkSaving(true);
    const rows = checked.map((i) => {
      const f = foods[i];
      const base = f.porcao_base_g || 100;
      return {
        user_id: user.id,
        food_name: f.nome,
        quantity: `${base}g`,
        meal_type: mealType,
        logged_at: todayISO(),
        calories: round(f.macros.calorias),
        protein: round(f.macros.proteina),
        carbs: round(f.macros.carboidratos),
        fat: round(f.macros.gorduras),
        fiber: round(f.macros.fibras),
      };
    });
    const invalidRow = rows.find((r) => validateNutrition(r.calories, r.protein, r.carbs, r.fat, r.fiber));
    if (invalidRow) {
      setBulkSaving(false);
      toast({ title: "Dados nutricionais inválidos", description: `Valores de "${invalidRow.food_name}" estão fora do intervalo aceitável.`, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("food_log").insert(rows);
    setBulkSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    sync(["food"]);
    toast({ title: "Alimentos adicionados ao diário.", description: `${rows.length} itens registrados.` });
  };

  const saveFavorite = async () => {
    if (!selected) return;
    if (!user) return navigate("/auth");
    const { error } = await supabase.from("food_favorites").upsert(
      {
        user_id: user.id,
        food_name: selected.nome,
        emoji: selected.emoji ?? null,
        category: selected.categoria ?? null,
        portion_g: portion,
        calories: scaled(selected.macros.calorias),
        protein: scaled(selected.macros.proteina),
        carbs: scaled(selected.macros.carboidratos),
        fat: scaled(selected.macros.gorduras),
        fiber: scaled(selected.macros.fibras),
        sodium_mg: scaled(selected.micros?.sodio_mg),
      },
      { onConflict: "user_id,food_name" }
    );
    if (error) {
      toast({ title: "Erro ao favoritar", description: error.message, variant: "destructive" });
      return;
    }
    sync(["favorites"]);
    toast({ title: "Salvo nos favoritos", description: "Disponível na busca rápida do diário." });
  };

  const macroCards = selected
    ? [
        { icon: Flame, label: "Calorias", value: `${scaled(selected.macros.calorias)}`, unit: "kcal", color: "text-primary" },
        { icon: Beef, label: "Proteínas", value: `${scaled(selected.macros.proteina)}`, unit: "g", color: "text-primary" },
        { icon: Wheat, label: "Carboidratos", value: `${scaled(selected.macros.carboidratos)}`, unit: "g", color: "text-accent" },
        { icon: Droplets, label: "Gorduras", value: `${scaled(selected.macros.gorduras)}`, unit: "g", color: "text-foreground" },
        { icon: Leaf, label: "Fibras", value: `${scaled(selected.macros.fibras)}`, unit: "g", color: "text-primary" },
      ]
    : [];

  const microList = selected?.micros
    ? ([
        ["Vitamina C", selected.micros.vitamina_c_mg],
        ["Cálcio", selected.micros.calcio_mg],
        ["Ferro", selected.micros.ferro_mg],
        ["Potássio", selected.micros.potassio_mg],
        ["Magnésio", selected.micros.magnesio_mg],
        ["Sódio", selected.micros.sodio_mg],
      ] as [string, number | undefined][]).filter(([, v]) => typeof v === "number" && v > 0)
    : [];

  const totalMacroG = selected
    ? (selected.macros.proteina || 0) + (selected.macros.carboidratos || 0) + (selected.macros.gorduras || 0) || 1
    : 1;

  return (
    <div className="space-y-6">
      <CameraCapture open={camOpen} onClose={() => setCamOpen(false)} onCapture={pickFile} hint="Enquadre o alimento ou a embalagem" />
      {/* Objetivo */}
      <div className="bg-card rounded-2xl shadow-soft p-5">
        <p className="text-sm font-medium text-foreground mb-3">Seu objetivo</p>
        <div className="flex flex-wrap gap-2">
          {objetivos.map((o) => (
            <button
              key={o.id}
              onClick={() => setObjetivo(o.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                objetivo === o.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload */}
      {!image && (
        <div className="bg-card rounded-2xl shadow-soft p-6 sm:p-8 text-center">
          <div className="border-2 border-dashed border-border rounded-2xl p-10 hover:border-primary/50 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <p className="font-display font-semibold text-foreground mb-1">Escaneie um alimento ou bebida</p>
            <p className="text-sm text-muted-foreground mb-6">Foto, galeria ou upload · JPG, PNG ou WEBP</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" className="gap-2" onClick={() => setCamOpen(true)}>
                <Camera className="w-5 h-5" /> Tirar foto
              </Button>
              <Button variant="outline" size="lg" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="w-5 h-5" /> Enviar imagem
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
            />
          </div>
        </div>
      )}

      {/* Preview / analyzing */}
      {image && !foods && (
        <div className="bg-card rounded-2xl shadow-soft p-5 text-center">
          <div className="relative overflow-hidden rounded-2xl mb-5">
            <img src={image} alt="Alimento escaneado" className="w-full max-h-72 object-cover" />
            {analyzing && (
              <>
                <div className="absolute inset-0 bg-primary/10" />
                <div className="absolute left-0 right-0 h-1 bg-primary/80 shadow-glow animate-[scanline_2s_ease-in-out_infinite]" />
              </>
            )}
          </div>
          {analyzing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                <Sparkles className="w-4 h-4 animate-pulse" /> {stages[stage]}
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: `${(stage + 1) * 33}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" className="gap-2" onClick={analyze}>
                <Sparkles className="w-5 h-5" /> Confirmar e analisar
              </Button>
              <Button variant="outline" size="lg" onClick={reset}>
                Tirar nova foto
              </Button>
            </div>
          )}
          {errorMsg && (
            <div className="mt-5 flex items-start gap-3 text-left bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          )}
        </div>
      )}

      {/* Lista de alimentos identificados */}
      {foods && !selected && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm text-muted-foreground text-center">
            Encontramos {foods.length} {foods.length === 1 ? "alimento" : "alimentos"}. Selecione o que deseja registrar.
          </p>
          {foods.map((f, i) => (
            <div key={i} className="bg-card rounded-2xl shadow-soft p-4">
              <div className="flex items-start gap-4">
                {foods.length > 1 && (
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${f.nome}`}
                    checked={checked.includes(i)}
                    onChange={(e) =>
                      setChecked((c) => (e.target.checked ? [...c, i] : c.filter((x) => x !== i)))
                    }
                    className="mt-1 w-4 h-4 accent-[hsl(var(--primary))]"
                  />
                )}
                {image && <img src={image} alt={f.nome} className="w-16 h-16 rounded-xl object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground truncate">
                    {f.emoji} {f.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">{f.categoria}{f.marca ? ` · ${f.marca}` : ""}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${f.confianca}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{f.confianca}% de confiança</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full gap-2" onClick={() => openFood(f)}>
                Ver análise nutricional <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {foods.length > 1 && (
            <div className="bg-card rounded-2xl shadow-soft p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Registrar em qual refeição?</p>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMealType(m.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      mealType === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {m.short}
                  </button>
                ))}
              </div>
              <Button
                variant="hero"
                className="w-full gap-2"
                disabled={!checked.length || bulkSaving}
                onClick={addSelectedToDiary}
              >
                {bulkSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar {checked.length} ao diário
              </Button>
            </div>
          )}

          <div className="text-center">
            <Button variant="outline" onClick={reset} className="gap-2">
              <Camera className="w-4 h-4" /> Escanear outro
            </Button>
          </div>
        </div>
      )}

      {/* Detalhe */}
      {selected && (
        <div className="space-y-5 animate-fade-in">
          <button
            onClick={() => (foods && foods.length > 1 ? setSelected(null) : reset())}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="bg-card rounded-2xl shadow-soft p-5">
            <div className="flex items-center gap-4">
              {image && <img src={image} alt={selected.nome} className="w-20 h-20 rounded-2xl object-cover" />}
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {selected.emoji} {selected.nome}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selected.categoria}
                  {selected.marca ? ` · ${selected.marca}` : ""}
                  {selected.tipo_produto ? ` · ${selected.tipo_produto}` : ""}
                </p>
                {selected.quantidade_estimada && (
                  <p className="text-xs text-muted-foreground mt-1">Estimado: {selected.quantidade_estimada}</p>
                )}
                {typeof selected.confianca === "number" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimativa da IA · {selected.confianca}% de confiança
                  </p>
                )}
              </div>
            </div>

            {!!selected.possiveis_identificacoes?.length && (
              <div className="mt-4 rounded-xl bg-secondary/50 p-4">
                <p className="text-sm font-medium text-foreground mb-2">Possível identificação — confirme antes de continuar:</p>
                <ul className="space-y-1">
                  {selected.possiveis_identificacoes.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {i + 1}. {p.nome} ({p.confianca}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!selected.ingredientes_visiveis?.length && (
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Ingredientes visíveis:</span>{" "}
                {selected.ingredientes_visiveis.join(", ")}
              </p>
            )}
          </div>

          {/* Porção */}
          <div className="bg-card rounded-2xl shadow-soft p-5">
            <p className="text-sm font-medium text-foreground mb-3">
              Porção considerada <span className="text-muted-foreground">(base: {selected.porcao_base})</span>
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {[50, 100, 200].map((p) => (
                <button
                  key={p}
                  onClick={() => { setPortion(p); setCustomPortion(""); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    portion === p && !customPortion
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {p}g
                </button>
              ))}
              <Input
                type="number"
                min={1}
                placeholder="Personalizada (g)"
                value={customPortion}
                onChange={(e) => {
                  setCustomPortion(e.target.value);
                  const v = Number(e.target.value);
                  if (v > 0) setPortion(v);
                }}
                className="w-44"
              />
            </div>
          </div>

          {/* Macros */}
          <div className="bg-card rounded-2xl shadow-soft p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Macronutrientes · {portion}g</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {macroCards.map((m) => (
                <div key={m.label} className="rounded-2xl bg-secondary/50 p-4 text-center">
                  <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
                  <p className="font-display text-lg font-bold text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.unit} · {m.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-2.5 rounded-full overflow-hidden bg-secondary">
              <div className="bg-primary" style={{ width: `${((selected.macros.proteina || 0) / totalMacroG) * 100}%` }} />
              <div className="bg-accent" style={{ width: `${((selected.macros.carboidratos || 0) / totalMacroG) * 100}%` }} />
              <div className="bg-primary/40" style={{ width: `${((selected.macros.gorduras || 0) / totalMacroG) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Proteína · Carboidrato · Gordura</p>
          </div>

          {/* Micros */}
          {microList.length > 0 && (
            <div className="bg-card rounded-2xl shadow-soft p-5">
              <h3 className="font-display font-semibold text-foreground mb-4">Micronutrientes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {microList.map(([label, v]) => (
                  <div key={label} className="rounded-xl bg-secondary/50 p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-display font-semibold text-foreground">{round((v as number) * factor)} mg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Análise objetivo */}
          {selected.analise_objetivo && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Para o seu objetivo
              </p>
              <p className="text-sm text-muted-foreground">{selected.analise_objetivo}</p>
            </div>
          )}

          {/* Alternativas */}
          {!!selected.alternativas?.length && (
            <div className="bg-card rounded-2xl shadow-soft p-5">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Salad className="w-5 h-5 text-primary" /> Alternativas mais saudáveis
              </h3>
              <div className="space-y-3">
                {selected.alternativas.map((a, i) => (
                  <div key={i} className="rounded-xl bg-secondary/50 p-3">
                    <p className="text-sm font-medium text-foreground">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">{a.motivo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparação */}
          {compareWith && (
            <div className="bg-card rounded-2xl shadow-soft p-5">
              <h3 className="font-display font-semibold text-foreground mb-4">Comparação (por {portion}g)</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span />
                <span className="font-medium text-foreground truncate">{selected.nome}</span>
                <span className="font-medium text-foreground truncate">{compareWith.nome}</span>
                {([
                  ["Calorias", "calorias"],
                  ["Proteína", "proteina"],
                  ["Carbo.", "carboidratos"],
                  ["Gordura", "gorduras"],
                  ["Fibras", "fibras"],
                ] as [string, keyof Macros][]).map(([label, key]) => (
                  <Fragment key={label}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground">{round(((selected.macros[key] as number) || 0) * factor)}</span>
                    <span className="text-foreground">
                      {round(((compareWith.macros[key] as number) || 0) * (portion / (compareWith.porcao_base_g || 100)))}
                    </span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Refeição */}
          <div className="bg-card rounded-2xl shadow-soft p-5">
            <p className="text-sm font-medium text-foreground mb-3">Refeição do diário</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMealType(m.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    mealType === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="hero" size="lg" className="gap-2" onClick={addToDiary} disabled={saving}>
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Adicionar ao Diário
            </Button>
            <Button variant="outline" size="lg" className="gap-2" onClick={saveFavorite}>
              <Bookmark className="w-5 h-5" /> Salvar nos Favoritos
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => {
                setCompareWith(selected);
                reset();
                toast({ title: "Modo comparação", description: `Escaneie outro alimento para comparar com ${selected.nome}.` });
              }}
            >
              <GitCompare className="w-5 h-5" /> Comparar com outro
            </Button>
            <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate("/diario")}>
              <Check className="w-5 h-5" /> Abrir o diário
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center px-4">
            Os valores são estimativas baseadas na imagem identificada. Para maior precisão, informe a quantidade
            consumida ou leia o rótulo nutricional.
          </p>

          <div className="text-center">
            <Button variant="ghost" onClick={reset} className="gap-2">
              <Camera className="w-4 h-4" /> Escanear novo alimento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodScanner;