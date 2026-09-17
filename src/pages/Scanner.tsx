import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import CameraCapture from "@/components/CameraCapture";
import { Camera, Upload, Zap, Apple, Flame, Lightbulb, RefreshCw } from "lucide-react";
import MotivationalQuote from "@/components/MotivationalQuote";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import FoodScanner from "@/components/FoodScanner";
import BarcodeScanner from "@/components/BarcodeScanner";
import PortionScanner from "@/components/PortionScanner";
import { compressImage } from "@/lib/compressImage";

interface Alimento {
  nome: string;
  quantidade: string;
  calorias: number;
}

interface Receita {
  nome: string;
  ingredientes: string[];
  tempo: string;
  calorias: number;
  proteina: number;
  carb: number;
  gordura: number;
  preparo?: string;
}

interface AnalysisResult {
  alimentos: Alimento[];
  receitas: Receita[];
  dicas: string[];
}

const Scanner = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState<"alimento" | "codigo" | "geladeira" | "porcao">("alimento");

  const handleImage = async (file: File) => {
    if (!/image\/(jpeg|jpg|png|webp)/i.test(file.type)) {
      toast({ title: "Formato não suportado", description: "Use JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 15_000_000) {
      toast({ title: "Imagem muito grande", description: "Envie uma foto de até 15MB.", variant: "destructive" });
      return;
    }
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
      setResult(null);
    } catch {
      toast({ title: "Não consegui ler a imagem", description: "Arquivo corrompido ou inválido. Tente outra foto.", variant: "destructive" });
    }
  };

  const analyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-fridge", {
        body: { imageBase64: image },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const analysisResult = data as AnalysisResult;
      setResult(analysisResult);

      // Save to history if logged in
      if (user) {
        await supabase.from("scan_history").insert({
          user_id: user.id,
          result: data,
        });
      }
    } catch (e: unknown) {
      console.error("Erro na análise:", e);
      const message = e instanceof Error ? e.message : undefined;
      toast({
        title: "Erro na análise",
        description: message || "Não foi possível analisar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-10">
          <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-display text-sm font-medium">
            🔬 Função principal
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Scanner <span className="text-primary">Inteligente</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            {tab === "alimento"
              ? "Fotografe um alimento, bebida ou produto e receba uma análise nutricional completa"
              : tab === "codigo"
              ? "Leia o código de barras do produto e registre os dados nutricionais no seu diário"
              : "Tire uma foto da sua geladeira e a IA vai sugerir receitas práticas, saudáveis e econômicas"}
          </p>
          <div className="mt-6 inline-flex p-1 rounded-full bg-secondary">
            {([
              ["alimento", "Alimento"],
              ["codigo", "Código de barras"],
              ["geladeira", "Geladeira"],
              ["porcao", "Porção"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  tab === id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "alimento" && <FoodScanner />}

        <CameraCapture open={camOpen} onClose={() => setCamOpen(false)} onCapture={handleImage} hint="Enquadre a geladeira aberta" />

        {tab === "codigo" && <BarcodeScanner />}

        {tab === "porcao" && <PortionScanner />}

        {/* Upload area */}
        {tab === "geladeira" && !image && (
          <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
            <div className="border-2 border-dashed border-border rounded-xl p-12 hover:border-primary/50 transition-colors">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-display font-semibold text-foreground mb-2">
                Fotografe sua geladeira
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Tire uma foto ou envie uma imagem
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => setCamOpen(true)}
                  className="gap-2"
                >
                  <Camera className="w-5 h-5" /> Tirar foto
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fileRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-5 h-5" /> Enviar imagem
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
              />
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="p-4">
                <Zap className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Receitas instantâneas</p>
              </div>
              <div className="p-4">
                <Flame className="w-6 h-6 text-accent mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Calorias estimadas</p>
              </div>
              <div className="p-4">
                <Apple className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Info nutricional</p>
              </div>
            </div>
          </div>
        )}

        {/* Image preview */}
        {tab === "geladeira" && image && !result && (
          <div className="bg-card rounded-2xl shadow-soft p-6 text-center">
            <img src={image} alt="Sua geladeira" className="w-full max-h-80 object-cover rounded-xl mb-6" />
            <div className="flex gap-3 justify-center">
              <Button variant="hero" size="lg" onClick={analyze} disabled={analyzing} className="gap-2">
                {analyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Analisando...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> Analisar com IA
                  </>
                )}
              </Button>
              <Button variant="outline" size="lg" onClick={reset}>
                Nova foto
              </Button>
            </div>
            {analyzing && (
              <div className="mt-6">
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">Identificando alimentos e gerando receitas...</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {tab === "geladeira" && result && (
          <div className="space-y-6 animate-fade-in">
            {/* Image */}
            <div className="bg-card rounded-2xl shadow-soft p-4">
              <img src={image!} alt="Sua geladeira" className="w-full max-h-48 object-cover rounded-xl" />
            </div>

            {/* Identified foods */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Apple className="w-5 h-5 text-primary" /> Alimentos identificados
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {result.alimentos.map((a) => (
                  <div key={a.nome} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                    <div>
                      <p className="font-medium text-foreground text-sm">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">{a.quantidade}</p>
                    </div>
                    <span className="text-xs font-display font-semibold text-primary">{a.calorias} cal</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recipes */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent" /> Receitas sugeridas
              </h2>
              <div className="space-y-4">
                {result.receitas.map((r) => (
                  <div key={r.nome} className="border-2 border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-semibold text-foreground">{r.nome}</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">⏱ {r.tempo}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Ingredientes: {r.ingredientes.join(", ")}
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="font-display font-bold text-foreground text-sm">{r.calorias}</p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="font-display font-bold text-primary text-sm">{r.proteina}g</p>
                        <p className="text-xs text-muted-foreground">prot</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="font-display font-bold text-accent text-sm">{r.carb}g</p>
                        <p className="text-xs text-muted-foreground">carb</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-2">
                        <p className="font-display font-bold text-foreground text-sm">{r.gordura}g</p>
                        <p className="text-xs text-muted-foreground">gord</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent" /> Dicas personalizadas
              </h2>
              <div className="space-y-3">
                {result.dicas.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-display font-bold text-xs">
                      {i + 1}
                    </span>
                    <p className="text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Button variant="outline" size="lg" onClick={reset} className="gap-2">
                <Camera className="w-5 h-5" /> Escanear novamente
              </Button>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                🤖 <strong>IA ativa!</strong> Os resultados são gerados em tempo real pela inteligência artificial analisando sua foto.
              </p>
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

export default Scanner;
