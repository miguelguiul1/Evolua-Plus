import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Barcode, Camera, RefreshCw, Plus, AlertTriangle, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/useAuth";
import { useNavigate } from "react-router-dom";
import { MEAL_TYPES, todayISO, useSyncModules } from "@/hooks/useNutrition";
import { RANGES, checkRange, checkText, firstError, normalizeBarcode, parseNum } from "@/lib/validation";

type Product = {
  code: string;
  nome: string;
  marca: string | null;
  porcao_base_g: number;
  calorias: number;
  proteina: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  sodio_mg: number;
  estimado: boolean;
};

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.round(v * 10) / 10 : 0);

const emptyProduct = (code: string): Product => ({
  code,
  nome: "",
  marca: null,
  porcao_base_g: 100,
  calorias: 0,
  proteina: 0,
  carboidratos: 0,
  gorduras: 0,
  fibras: 0,
  sodio_mg: 0,
  estimado: true,
});

const BarcodeScanner = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const sync = useSyncModules();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);

  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [portion, setPortion] = useState(100);
  const [mealType, setMealType] = useState("outro");
  const [saving, setSaving] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (loopRef.current) window.clearInterval(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // @ts-expect-error BarcodeDetector is not in TS lib yet
      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      loopRef.current = window.setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found?.length) {
            const value = found[0].rawValue as string;
            stopCamera();
            setCode(value);
            lookup(value);
          }
        } catch {
          /* frame sem código */
        }
      }, 500);
    } catch {
      setScanning(false);
      toast({
        title: "Câmera indisponível",
        description: "Permita o acesso à câmera ou digite o código manualmente.",
        variant: "destructive",
      });
    }
  };

  const lookup = async (value: string) => {
    const clean = normalizeBarcode(value);
    if (!clean) {
      toast({
        title: "Código inválido",
        description: "Use um código de barras numérico com 8 a 14 dígitos.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setNotFound(false);
    setProduct(null);
    setRateLimited(false);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,brands,nutriments,serving_quantity`
      );
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        setRateLimited(true);
        toast({
          title: "Limite temporário atingido",
          description: retryAfter
            ? `Muitas requisições. Aguarde ${retryAfter} segundos antes de tentar novamente.`
            : "Muitas requisições. Aguarde alguns segundos antes de tentar novamente.",
          variant: "destructive",
        });
        return;
      }
      const json = await res.json();
      if (json?.status !== 1 || !json?.product) {
        setNotFound(true);
        setProduct(emptyProduct(clean));
        setPortion(100);
        return;
      }
      const p = json.product;
      const n = p.nutriments ?? {};
      const found: Product = {
        code: clean,
        nome: p.product_name || "Produto sem nome",
        marca: p.brands || null,
        porcao_base_g: 100,
        calorias: num(n["energy-kcal_100g"]),
        proteina: num(n.proteins_100g),
        carboidratos: num(n.carbohydrates_100g),
        gorduras: num(n.fat_100g),
        fibras: num(n.fiber_100g),
        sodio_mg: num(n.sodium_100g ? n.sodium_100g * 1000 : 0),
        estimado: !n["energy-kcal_100g"],
      };
      setProduct(found);
      setPortion(Number(p.serving_quantity) > 0 ? Math.round(Number(p.serving_quantity)) : 100);
    } catch {
      setNotFound(true);
      setProduct(emptyProduct(clean));
    } finally {
      setLoading(false);
    }
  };

  const factor = product ? portion / (product.porcao_base_g || 100) : 1;
  const sc = (v: number) => Math.round(v * factor * 10) / 10;

  const validateProduct = (): string | null => {
    if (!product) return "Produto não carregado";
    return firstError([
      checkText(product.nome, "o nome do produto", 200),
      checkRange(portion, RANGES.porcao),
      checkRange(product.calorias, RANGES.calorias),
      checkRange(product.proteina, RANGES.macro),
      checkRange(product.carboidratos, RANGES.macro),
      checkRange(product.gorduras, RANGES.macro),
      checkRange(product.fibras, RANGES.macro),
      checkRange(product.sodio_mg, RANGES.sodio),
    ]);
  };

  const addToDiary = async () => {
    if (!product) return;
    if (!user) return navigate("/auth");
    const invalid = validateProduct();
    if (invalid) {
      toast({ title: invalid, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("food_log").insert({
      user_id: user.id,
      food_name: product.marca ? `${product.nome} (${product.marca})` : product.nome,
      quantity: `${portion}g`,
      meal_type: mealType,
      logged_at: todayISO(),
      calories: sc(product.calorias),
      protein: sc(product.proteina),
      carbs: sc(product.carboidratos),
      fat: sc(product.gorduras),
      fiber: sc(product.fibras),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    sync(["food"]);
    toast({ title: "Adicionado ao diário", description: `${product.nome} · ${portion}g` });
  };

  const saveFavorite = async () => {
    if (!product || !user) return user ? undefined : navigate("/auth");
    const invalid = validateProduct();
    if (invalid) {
      toast({ title: invalid, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("food_favorites").upsert(
      {
        user_id: user.id,
        food_name: product.nome,
        category: "Produto industrializado",
        portion_g: portion,
        calories: sc(product.calorias),
        protein: sc(product.proteina),
        carbs: sc(product.carboidratos),
        fat: sc(product.gorduras),
        fiber: sc(product.fibras),
        sodium_mg: sc(product.sodio_mg),
      },
      { onConflict: "user_id,food_name" }
    );
    if (error) {
      toast({ title: "Erro ao favoritar", description: error.message, variant: "destructive" });
      return;
    }
    sync(["favorites"]);
    toast({ title: "Salvo nos favoritos" });
  };

  const setField = (k: keyof Product, v: string) =>
    setProduct((p) => (p ? { ...p, [k]: k === "nome" ? v.slice(0, 200) : (parseNum(v) ?? 0) } : p));

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl shadow-soft p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Barcode className="w-7 h-7 text-primary" />
        </div>
        <p className="font-display font-semibold text-foreground mb-1">Escaneie o código de barras</p>
        <p className="text-sm text-muted-foreground mb-5">
          Buscamos os dados nutricionais do produto. Se não encontrarmos, você pode preencher manualmente.
        </p>

        {scanning ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl">
              <video ref={videoRef} playsInline muted className="w-full max-h-72 object-cover" />
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-primary/80 shadow-glow" />
            </div>
            <Button variant="outline" onClick={stopCamera}>Parar câmera</Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {supported && (
              <Button variant="hero" size="lg" className="gap-2" onClick={startCamera}>
                <Camera className="w-5 h-5" /> Escanear com a câmera
              </Button>
            )}
          </div>
        )}

        {!supported && !scanning && (
          <p className="text-xs text-muted-foreground mb-3">
            Seu navegador não suporta leitura automática. Digite o código abaixo.
          </p>
        )}

        <div className="mt-5 flex gap-2 max-w-sm mx-auto">
          <Input
            inputMode="numeric"
            placeholder="Digite o código (ex: 7891000100103)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button variant="outline" disabled={loading} onClick={() => lookup(code)}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>
      </div>

      {notFound && (
        <div className="flex items-start gap-3 bg-accent/10 border border-accent/20 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Não encontramos esse produto na base pública. Preencha os dados abaixo (valores por 100 g) para registrar
            no diário.
          </p>
        </div>
      )}

      {rateLimited && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            O serviço de consulta atingiu o limite de requisições. Aguarde alguns segundos e tente novamente.
          </p>
        </div>
      )}

      {product && (
        <div className="bg-card rounded-2xl shadow-soft p-5 space-y-4 animate-fade-in">
          <div>
            <label className="text-xs text-muted-foreground">Produto</label>
            <Input value={product.nome} onChange={(e) => setField("nome", e.target.value)} placeholder="Nome do produto" />
            {product.marca && <p className="text-xs text-muted-foreground mt-1">Marca: {product.marca}</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ["calorias", "Calorias (kcal/100g)"],
              ["proteina", "Proteínas (g)"],
              ["carboidratos", "Carboidratos (g)"],
              ["gorduras", "Gorduras (g)"],
              ["fibras", "Fibras (g)"],
              ["sodio_mg", "Sódio (mg)"],
            ] as [keyof Product, string][]).map(([k, label]) => (
              <div key={k as string}>
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  type="number"
                  value={String(product[k] ?? 0)}
                  onChange={(e) => setField(k, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Quantidade consumida (g/ml)</label>
            <Input type="number" value={portion} onChange={(e) => setPortion(Number(e.target.value) || 0)} />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              [sc(product.calorias), "kcal"],
              [sc(product.proteina), "prot"],
              [sc(product.carboidratos), "carb"],
              [sc(product.gorduras), "gord"],
            ].map(([v, l]) => (
              <div key={l as string} className="bg-secondary/50 rounded-lg p-2">
                <p className="font-display font-bold text-foreground text-sm">{v}</p>
                <p className="text-[10px] text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            ℹ️ Valores estimados a partir da base pública Open Food Facts — confira o rótulo quando possível.
          </p>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Registrar em qual refeição?</p>
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
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" className="flex-1 gap-2" disabled={saving} onClick={addToDiary}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar ao diário
            </Button>
            <Button variant="outline" className="gap-2" onClick={saveFavorite}>
              <Bookmark className="w-4 h-4" /> Favoritar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
