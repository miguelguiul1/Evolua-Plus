import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RefreshCw, Flame, Beef, Wheat, Droplets, Plus, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/useAuth";
import { useNavigate } from "react-router-dom";
import { MEAL_TYPES, todayISO, useSyncModules } from "@/hooks/useNutrition";
import { compressImage } from "@/lib/compressImage";
import { RANGES, checkRange, firstError } from "@/lib/validation";
import CameraCapture from "@/components/CameraCapture";

interface PortionItem {
  alimento: string;
  quantidade: string;
  calorias: number;
  proteina: number;
  carb: number;
  gordura: number;
}

interface PortionResult {
  prato: string;
  porcao_estimada: string;
  calorias_totais: number;
  itens: PortionItem[];
  avaliacao: string;
  dica: string;
}

const PortionScanner = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const sync = useSyncModules();
  const fileRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PortionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mealType, setMealType] = useState<string>("outro");
  const [saving, setSaving] = useState(false);

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
    setResult(null);
    setErrorMsg(null);
  };

  const analyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("portion-scanner", {
        body: { imageBase64: image },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.itens?.length) {
        setErrorMsg("Não consegui identificar os alimentos nessa imagem. Tente uma foto mais nítida do prato.");
        return;
      }
      setResult(data as PortionResult);
      if (user) {
        await supabase.from("scan_history").insert({ user_id: user.id, result: data });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      toast({ title: "Erro na análise", description: msg, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setErrorMsg(null);
  };

  const addAllToDiary = async () => {
    if (!result?.itens?.length || !user) return;
    setSaving(true);
    const rows = result.itens.map((item) => ({
      user_id: user.id,
      food_name: item.alimento,
      quantity: item.quantidade,
      meal_type: mealType,
      logged_at: todayISO(),
      calories: Math.round((item.calorias || 0) * 10) / 10,
      protein: Math.round((item.proteina || 0) * 10) / 10,
      carbs: Math.round((item.carb || 0) * 10) / 10,
      fat: Math.round((item.gordura || 0) * 10) / 10,
      fiber: null,
    }));
    const invalidRow = rows.find((r) =>
      firstError([
        checkRange(r.calories, RANGES.calorias),
        checkRange(r.protein, RANGES.macro),
        checkRange(r.carbs, RANGES.macro),
        checkRange(r.fat, RANGES.macro),
      ])
    );
    if (invalidRow) {
      setSaving(false);
      toast({ title: "Dados nutricionais inválidos", description: `Valores de "${invalidRow.food_name}" estão fora do intervalo aceitável.`, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("food_log").insert(rows);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    sync(["food"]);
    toast({ title: "Itens adicionados ao diário.", description: `${rows.length} alimentos registrados.` });
  };

  const round = (n: number) => Math.round((n || 0) * 10) / 10;

  return (
    <div className="space-y-6">
      <CameraCapture open={camOpen} onClose={() => setCamOpen(false)} onCapture={pickFile} hint="Enquadre o prato inteiro" />
      {/* Upload */}
      {!image && (
        <div className="bg-card rounded-2xl shadow-soft p-6 sm:p-8 text-center">
          <div className="border-2 border-dashed border-border rounded-2xl p-10 hover:border-primary/50 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8 text-primary" />
            </div>
            <p className="font-display font-semibold text-foreground mb-1">Fotografe seu prato</p>
            <p className="text-sm text-muted-foreground mb-6">A IA identifica os alimentos e estima as calorias</p>
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
      {image && !result && (
        <div className="bg-card rounded-2xl shadow-soft p-5 text-center">
          <div className="relative overflow-hidden rounded-2xl mb-5">
            <img src={image} alt="Seu prato" className="w-full max-h-72 object-cover" />
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
                <RefreshCw className="w-4 h-4 animate-spin" /> Analisando porção...
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" className="gap-2" onClick={analyze}>
                <Flame className="w-5 h-5" /> Analisar porção
              </Button>
              <Button variant="outline" size="lg" onClick={reset}>
                Tirar nova foto
              </Button>
            </div>
          )}
          {errorMsg && (
            <div className="mt-5 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-5 animate-fade-in">
          {/* Header */}
          <div className="bg-card rounded-2xl shadow-soft p-5">
            <div className="flex items-start gap-4">
              {image && <img src={image} alt={result.prato} className="w-20 h-20 rounded-2xl object-cover" />}
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-foreground">{result.prato}</h2>
                <p className="text-sm text-muted-foreground">{result.porcao_estimada}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total estimado: <span className="font-semibold text-primary">{result.calorias_totais} kcal</span>
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-card rounded-2xl shadow-soft p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Alimentos identificados</h3>
            <div className="space-y-3">
              {result.itens.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm">{item.alimento}</p>
                    <p className="text-xs text-muted-foreground">{item.quantidade}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="flex items-center gap-1 text-primary">
                      <Flame className="w-3 h-3" /> {round(item.calorias)}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Beef className="w-3 h-3" /> {round(item.proteina)}g
                    </span>
                    <span className="flex items-center gap-1 text-accent">
                      <Wheat className="w-3 h-3" /> {round(item.carb)}g
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Droplets className="w-3 h-3" /> {round(item.gordura)}g
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avaliação */}
          {result.avaliacao && (
            <div className="bg-card rounded-2xl shadow-soft p-5">
              <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" /> Avaliação nutricional
              </h3>
              <p className="text-sm text-muted-foreground">{result.avaliacao}</p>
            </div>
          )}

          {/* Dica */}
          {result.dica && (
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Dica: </span>
                {result.dica}
              </p>
            </div>
          )}

          {/* Meal type + Add to diary */}
          <div className="bg-card rounded-2xl shadow-soft p-5 space-y-3">
            <p className="text-sm font-medium text-foreground">Registrar no diário</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMealType(m.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    mealType === m.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>
            <Button variant="hero" size="lg" className="w-full gap-2" disabled={saving} onClick={addAllToDiary}>
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Adicionar {result.itens.length} {result.itens.length === 1 ? "item" : "itens"} ao diário
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={reset} className="gap-2">
              <Camera className="w-4 h-4" /> Analisar outro prato
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortionScanner;
