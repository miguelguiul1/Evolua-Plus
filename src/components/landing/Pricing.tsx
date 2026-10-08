import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PLANS, formatPrice, planPrice, currencySymbol } from "@/config/plans";

interface PricingCard {
  name: string;
  price: string;
  period: string;
  desc: string;
  cta: string;
  href: string;
  highlight: boolean;
  badge: string | null;
  features: { text: string; on: boolean }[];
}

const gratuito: PricingCard = {
  name: "Gratuito",
  price: "R$0",
  period: "para sempre",
  desc: "Comece agora e conheça o Evolua Plus.",
  cta: "Criar conta grátis",
  href: "/auth",
  highlight: false,
  badge: null,
  features: [
    { text: "Calculadora nutricional completa", on: true },
    { text: "Diário alimentar básico", on: true },
    { text: "Biblioteca de alimentos", on: true },
    { text: "Plano semanal por IA", on: false },
    { text: "Scanner de geladeira", on: false },
    { text: "Assistente IA 24h", on: false },
  ],
};

const mensal: PricingCard = {
  name: "Plus Mensal",
  price: `${currencySymbol("pt")}${formatPrice(PLANS.mensal.priceBRL, "pt")}`,
  period: PLANS.mensal.period.pt,
  desc: "Acesso completo, cobrança mensal.",
  cta: "Assinar Plus",
  href: "/vendas",
  highlight: false,
  badge: null,
  features: [
    { text: "Tudo do Gratuito", on: true },
    { text: "Plano alimentar semanal por IA", on: true },
    { text: "Lista de compras inteligente", on: true },
    { text: "Scanner de geladeira e porção", on: true },
    { text: "Assistente IA 24h", on: true },
    { text: "Evolução com gráficos", on: true },
  ],
};

const anual: PricingCard = {
  name: "Plus Anual",
  price: `${currencySymbol("pt")}${formatPrice(PLANS.anual.priceBRL, "pt")}`,
  period: PLANS.anual.period.pt,
  desc: "Economize 30% no plano mais escolhido.",
  cta: "Assinar anual",
  href: "/vendas",
  highlight: true,
  badge: "Mais escolhido",
  features: [
    { text: "Tudo do Plus Mensal", on: true },
    { text: "Economia de R$108/ano", on: true },
    { text: "Guias educacionais exclusivos", on: true },
    { text: "Suporte prioritário", on: true },
    { text: "Novos recursos em primeira mão", on: true },
    { text: "Cancelamento a qualquer momento", on: true },
  ],
};

const plans = [gratuito, mensal, anual];

const Pricing = () => (
  <section id="planos" className="py-14 relative overflow-hidden">
    <div className="container mx-auto max-w-6xl relative">
      <div className="max-w-2xl mx-auto mb-10">
        <h2 className="font-display text-3xl font-semibold text-foreground">
          Planos
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Comece grátis. Faça upgrade quando quiser. Cancele quando quiser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-3xl p-7 border transition-all flex flex-col ${
              p.highlight
                ? "bg-card border-primary shadow-2xl shadow-primary/20 md:-translate-y-2"
                : "bg-card border-border/60 hover:border-primary/30"
            }`}
          >
            {p.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-display font-semibold px-3 py-1">
                {p.badge}
              </span>
            )}
            <h3 className="font-display text-xl font-bold text-foreground">{p.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 min-h-[2.5rem]">{p.desc}</p>
            <div className="mt-5 mb-6">
              <span className="font-display text-4xl font-bold text-foreground">{p.price}</span>
              <span className="text-sm text-muted-foreground ml-1">{p.period}</span>
            </div>
            <ul className="space-y-2.5 flex-1">
              {p.features.map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm">
                  {f.on ? (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={f.on ? "text-foreground" : "text-muted-foreground/70"}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild variant={p.highlight ? "hero" : "outline"} size="lg" className="mt-6 w-full">
              <Link to={p.href}>{p.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-6">
        Também disponível: plano semestral {currencySymbol("pt")}{formatPrice(PLANS.semestral.priceBRL, "pt")}. Preparando: Família, Nutricionista, Personal Trainer.
      </p>
    </div>
  </section>
);

export default Pricing;