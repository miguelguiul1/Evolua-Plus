import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Lock,
  CreditCard,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { PLANS, PLAN_KEYS, formatPrice, currencySymbol, planPrice, type PlanKey } from "@/config/plans";

const KIRVANO_CHECKOUT_URL = "#"; // Substituir pelo link real da Kirvano

const included = [
  "Cardápio semanal personalizado por IA",
  "Lista de compras inteligente",
  "+50 receitas práticas e acessíveis",
  "Scanner de geladeira com IA",
  "Diário alimentar automatizado",
  "Suporte prioritário",
];

const Checkout = () => {
  const [params] = useSearchParams();
  const initial = (params.get("plano") as PlanKey) || "semestral";
  const [selected, setSelected] = useState<PlanKey>(
    PLANS[initial] ? initial : "semestral",
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [paymentUnavailable, setPaymentUnavailable] = useState(false);

  const plan = PLANS[selected];

  const isPlaceholderCheckout = () =>
    !KIRVANO_CHECKOUT_URL || KIRVANO_CHECKOUT_URL === "#" || !/^https?:\/\//.test(KIRVANO_CHECKOUT_URL);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: { name?: string; email?: string; phone?: string } = {};
    if (!form.name.trim()) next.name = "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Informe um e-mail válido.";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) next.phone = "Informe um WhatsApp válido com DDD.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (isPlaceholderCheckout()) {
      setPaymentUnavailable(true);
      return;
    }
    setPaymentUnavailable(false);
    setSubmitting(true);
    // No app nativo, window.open dentro da WebView local não é confiável para abrir
    // um domínio de pagamento externo — usamos o navegador do sistema explicitamente.
    if (Capacitor.isNativePlatform()) {
      Browser.open({ url: KIRVANO_CHECKOUT_URL });
    } else {
      window.open(KIRVANO_CHECKOUT_URL, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => setSubmitting(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/vendas"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" />
            Assinatura Evolua Plus
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10 max-w-6xl">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-display font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Finalize sua assinatura
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3">
            Você está a um passo do <span className="text-gradient-primary">Evolua Plus</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Escolha seu plano e comece hoje. Cancelamento simples a qualquer momento.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Left: form + plans */}
          <div className="space-y-8">
            {/* Plans */}
            <Card className="border-border/60">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-display font-bold">
                    1
                  </div>
                  <h2 className="font-display font-semibold text-lg text-foreground">
                    Escolha seu plano
                  </h2>
                </div>

                <RadioGroup
                  value={selected}
                  onValueChange={(v) => setSelected(v as PlanKey)}
                  className="grid gap-3"
                >
                  {PLAN_KEYS.map((key) => {
                    const p = PLANS[key];
                    const active = selected === key;
                    const priceStr = formatPrice(p.priceBRL, "pt");
                    return (
                      <label
                        key={key}
                        htmlFor={`plan-${key}`}
                        className={`relative flex items-center gap-4 p-4 sm:p-5 rounded-xl border cursor-pointer transition-all ${
                          active
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <RadioGroupItem id={`plan-${key}`} value={key} />
                        <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold text-foreground">
                                {p.label.pt}
                              </span>
                              {p.badge.pt && (
                                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground font-semibold">
                                  {p.badge.pt}
                                </span>
                              )}
                            </div>
                            {p.savings?.pt && (
                              <span className="text-xs text-primary font-medium">
                                {p.savings.pt}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-display font-bold text-foreground">
                              {currencySymbol("pt")} {priceStr}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.period.pt}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="border-border/60">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-display font-bold">
                    2
                  </div>
                  <h2 className="font-display font-semibold text-lg text-foreground">
                    Seus dados
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                        if (paymentUnavailable) setPaymentUnavailable(false);
                      }}
                      placeholder="Seu nome"
                      aria-invalid={!!errors.name || undefined}
                      aria-describedby={errors.name ? "name-error" : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                          if (paymentUnavailable) setPaymentUnavailable(false);
                        }}
                        placeholder="voce@email.com"
                        aria-invalid={!!errors.email || undefined}
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                      {errors.email && (
                        <p id="email-error" className="text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">WhatsApp</Label>
                      <Input
                        id="phone"
                        required
                        value={form.phone}
                        onChange={(e) => {
                          setForm({ ...form, phone: e.target.value });
                          if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                          if (paymentUnavailable) setPaymentUnavailable(false);
                        }}
                        placeholder="(11) 90000-0000"
                        aria-invalid={!!errors.phone || undefined}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                      />
                      {errors.phone && (
                        <p id="phone-error" className="text-xs text-destructive">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="hero" size="xl" className="w-full" disabled={submitting}>
                      <CreditCard className="w-5 h-5" />
                      {submitting ? "Abrindo..." : "Assinar agora"}
                    </Button>
                    {paymentUnavailable && (
                      <p role="alert" className="mt-3 text-sm text-destructive text-center">
                        O pagamento ainda não está disponível neste ambiente. Você será avisado quando ativarmos a cobrança.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Em breve: pagamento por Pix, cartão ou boleto.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right: summary */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <Card className="border-primary/20 bg-card overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 to-accent/5 px-6 py-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                  <span className="font-display font-semibold text-sm text-foreground">
                    Resumo do pedido
                  </span>
                </div>
              </div>
              <CardContent className="p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Evolua Plus {plan.label.pt}
                    </span>
                    <span className="font-display font-semibold text-foreground">
                      {currencySymbol("pt")} {formatPrice(plan.priceBRL, "pt")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cobrado {plan.period.pt}
                  </p>
                </div>

                <div className="border-t border-border/60 pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display font-semibold text-foreground">
                      Total hoje
                    </span>
                    <div className="text-right">
                      <div className="font-display text-2xl font-bold text-foreground">
                        {currencySymbol("pt")} {formatPrice(plan.priceBRL, "pt")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4">
                  <p className="text-xs font-display font-semibold text-foreground mb-3 uppercase tracking-wide">
                    Incluso no plano
                  </p>
                  <ul className="space-y-2">
                    {included.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border/60 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    Garantia incondicional de 7 dias
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Checkout;