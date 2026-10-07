import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Star,
  ShieldCheck,
  Zap,
  Heart,
  ArrowRight,
  ChevronDown,
  Utensils,
  Target,
  Clock,
  Leaf,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PLANS, PLAN_KEYS, formatPrice, currencySymbol, planPrice } from "@/config/plans";

const CHECKOUT_URL = "/checkout";

type Lang = "pt" | "en";

const content: Record<Lang, {
  badge: string;
  heroTitle: React.ReactNode;
  heroSub: string;
  ctaHero: string;
  guarantee: string;
  benefitsTitle: string;
  benefitsSub: string;
  benefits: { title: string; description: string }[];
  testimonialsTitle: string;
  testimonialsSub: string;
  testimonials: { name: string; text: string; rating: number }[];
  pricingBadge: string;
  pricingTitle: string;
  pricingSub: string;
  pricingItems: string[];
  pricingCta: string;
  pricingGuarantee: string;
  faqTitle: string;
  faqs: { q: string; a: string }[];
  finalTitle: string;
  finalSub: string;
  finalCta: string;
  footerRights: string;
  footerDisclaimer: string;
}> = {
  pt: {
    badge: "🔥 Oferta por tempo limitado",
    heroTitle: (
      <>
        Transforme sua<br />
        <span className="text-gradient-primary">alimentação</span> sem<br />
        gastar uma fortuna
      </>
    ),
    heroSub: "Plano nutricional completo, personalizado e acessível. Receitas práticas, lista de compras e cardápio semanal por menos de R$1 por dia.",
    ctaHero: "Quero meu plano agora",
    guarantee: "Garantia de 7 dias",
    benefitsTitle: "Tudo que você recebe",
    benefitsSub: "Um plano completo para mudar sua relação com a comida de verdade.",
    benefits: [
      { title: "100% Personalizado", description: "Plano adaptado ao seu objetivo, rotina e preferências alimentares." },
      { title: "Receitas Práticas", description: "Refeições simples, saborosas e acessíveis para o dia a dia." },
      { title: "Economia de Tempo", description: "Lista de compras pronta e cardápio semanal organizado." },
      { title: "Sem Restrições Extremas", description: "Alimentação equilibrada sem cortar o que você gosta." },
      { title: "Resultados Rápidos", description: "Metas alcançáveis com acompanhamento inteligente." },
      { title: "Saúde em Primeiro Lugar", description: "Baseado em ciência nutricional atualizada." },
    ],
    testimonialsTitle: "Depoimentos",
    testimonialsSub: "Exemplos ilustrativos de uso do produto — ainda não há clientes reais.",
    testimonials: [
      { name: "Mariana S.", text: "Em 3 semanas já senti diferença na disposição e perdi 2kg sem passar fome. Super recomendo!", rating: 5 },
      { name: "Carlos R.", text: "Finalmente um plano que cabe no meu bolso e na minha rotina corrida. Melhor investimento que fiz.", rating: 5 },
      { name: "Ana Paula L.", text: "As receitas são deliciosas e fáceis de fazer. Minha família inteira aderiu!", rating: 5 },
    ],
    pricingBadge: "Oferta Especial",
    pricingTitle: "Plano Nutricional Completo",
    pricingSub: "Acesso imediato a tudo que você precisa",
    pricingItems: [
      "Cardápio semanal personalizado",
      "Lista de compras inteligente",
      "+50 receitas práticas e acessíveis",
      "Guia de substituições alimentares",
      "Suporte por 30 dias",
    ],
    pricingCta: "Garantir meu plano",
    pricingGuarantee: "7 dias de garantia incondicional",
    faqTitle: "Perguntas Frequentes",
    faqs: [
      { q: "Para quem é esse plano?", a: "Para qualquer pessoa que quer melhorar a alimentação de forma prática, acessível e sem radicalismo." },
      { q: "Preciso de suplementos?", a: "Não! O plano é baseado em alimentos naturais e acessíveis encontrados em qualquer mercado." },
      { q: "Recebo o plano na hora?", a: "Sim! Após a confirmação do pagamento, você recebe acesso imediato ao conteúdo." },
      { q: "Tem garantia?", a: "Sim! Garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do valor." },
      { q: "Funciona para vegetarianos?", a: "Sim! Temos opções adaptadas para diferentes preferências e restrições alimentares." },
    ],
    finalTitle: "Pronto para transformar sua alimentação?",
    finalSub: "Comece agora e veja resultados em poucos dias. Sem riscos com nossa garantia de 7 dias.",
    finalCta: "Começar agora",
    footerRights: "Todos os direitos reservados",
    footerDisclaimer: "Este produto não substitui acompanhamento médico ou nutricional profissional.",
  },
  en: {
    badge: "🔥 Limited time offer",
    heroTitle: (
      <>
        Transform your<br />
        <span className="text-gradient-primary">nutrition</span> without<br />
        breaking the bank
      </>
    ),
    heroSub: "Complete, personalized and affordable nutrition plan. Practical recipes, shopping list and weekly menu for less than $0.20 per day.",
    ctaHero: "Get my plan now",
    guarantee: "7-day guarantee",
    benefitsTitle: "Everything you get",
    benefitsSub: "A complete plan to truly change your relationship with food.",
    benefits: [
      { title: "100% Personalized", description: "Plan adapted to your goals, routine and food preferences." },
      { title: "Practical Recipes", description: "Simple, delicious and affordable meals for everyday life." },
      { title: "Save Time", description: "Ready-made shopping list and organized weekly menu." },
      { title: "No Extreme Restrictions", description: "Balanced eating without cutting what you love." },
      { title: "Fast Results", description: "Achievable goals with smart tracking." },
      { title: "Health First", description: "Based on up-to-date nutritional science." },
    ],
    testimonialsTitle: "Testimonials",
    testimonialsSub: "Illustrative examples of product usage — no real customers yet.",
    testimonials: [
      { name: "Mariana S.", text: "In 3 weeks I already felt a difference in energy and lost 2kg without starving. Highly recommend!", rating: 5 },
      { name: "Carlos R.", text: "Finally a plan that fits my budget and my busy routine. Best investment I've made.", rating: 5 },
      { name: "Ana Paula L.", text: "The recipes are delicious and easy to make. My whole family joined in!", rating: 5 },
    ],
    pricingBadge: "Special Offer",
    pricingTitle: "Complete Nutrition Plan",
    pricingSub: "Instant access to everything you need",
    pricingItems: [
      "Personalized weekly menu",
      "Smart shopping list",
      "+50 practical & affordable recipes",
      "Food substitution guide",
      "30-day support",
    ],
    pricingCta: "Get my plan",
    pricingGuarantee: "7-day unconditional guarantee",
    faqTitle: "Frequently Asked Questions",
    faqs: [
      { q: "Who is this plan for?", a: "For anyone who wants to improve their diet in a practical, affordable way without extremes." },
      { q: "Do I need supplements?", a: "No! The plan is based on natural, affordable foods found at any grocery store." },
      { q: "Do I get instant access?", a: "Yes! After payment confirmation, you get immediate access to all content." },
      { q: "Is there a guarantee?", a: "Yes! Unconditional 7-day guarantee. If you don't like it, we refund 100%." },
      { q: "Does it work for vegetarians?", a: "Yes! We have options adapted for different preferences and dietary restrictions." },
    ],
    finalTitle: "Ready to transform your nutrition?",
    finalSub: "Start now and see results in just a few days. Risk-free with our 7-day guarantee.",
    finalCta: "Start now",
    footerRights: "All rights reserved",
    footerDisclaimer: "This product does not replace professional medical or nutritional guidance.",
  },
};

const benefitIcons = [Target, Utensils, Clock, Leaf, Zap, Heart];

const FAQItem = ({ q, a, id }: { q: string; a: string; id: number }) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-controls={`faq-conteudo-${id}`}
      className="w-full text-left border border-border rounded-xl p-5 transition-all hover:border-primary/30"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-display font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <p id={`faq-conteudo-${id}`} className="mt-3 text-muted-foreground text-sm leading-relaxed">{a}</p>
      )}
    </button>
  );
};

const Vendas = () => {
  const [lang, setLang] = useState<Lang>("pt");
  const t = content[lang];

  return (
    <div className="min-h-dvh bg-background">
      {/* Language Switcher */}
      <div className="fixed top-20 right-4 z-50">
        <div className="flex items-center gap-1 bg-card border border-border rounded-full p-1 shadow-md">
          <button
            onClick={() => setLang("pt")}
            aria-pressed={lang === "pt"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-all ${
              lang === "pt"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🇧🇷 PT
          </button>
          <button
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-all ${
              lang === "en"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🇺🇸 EN
          </button>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative z-10 container mx-auto text-center max-w-3xl">
          <span className="inline-block mb-5 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-display text-sm font-semibold tracking-wide">
            {t.badge}
          </span>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-foreground">
            {t.heroTitle}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto font-body leading-relaxed">
            {t.heroSub}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild variant="hero" size="xl" className="group">
              <Link to={CHECKOUT_URL}>
                {t.ctaHero}
                <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              {t.guarantee}
            </span>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-card/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-foreground mb-4">
            {t.benefitsTitle}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            {t.benefitsSub}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.benefits.map((b, i) => {
              const Icon = benefitIcons[i];
              return (
                <Card
                  key={b.title}
                  className="border-border/60 bg-background/80 hover:border-primary/30 transition-colors"
                >
                  <CardContent className="p-6 flex gap-4">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground mb-1">
                        {b.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {b.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-foreground mb-4">
            {t.testimonialsTitle}
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            {t.testimonialsSub}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {t.testimonials.map((tm) => (
              <Card key={tm.name} className="border-border/60 bg-card">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: tm.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-foreground text-sm leading-relaxed mb-4">
                    "{tm.text}"
                  </p>
                  <span className="text-xs font-display font-semibold text-muted-foreground">
                    — {tm.name}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 sm:py-24 bg-card/50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <span className="text-sm font-display font-semibold text-primary">
              {t.pricingBadge}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-2">
              {t.pricingTitle}
            </h2>
            <p className="text-muted-foreground text-sm mt-2">{t.pricingSub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLAN_KEYS.map((key) => {
              const p = PLANS[key];
              const price = planPrice(p, lang);
              const priceStr = formatPrice(price, lang);
              const [intPart, decPart] = priceStr.split(lang === "pt" ? "," : ".");
              const badge = p.badge[lang];
              return (
                <Card key={p.key} className={`relative border ${p.highlight ? "border-primary shadow-lg md:scale-105" : "border-border/60"} bg-background overflow-hidden`}>
                  {badge && (
                    <div className={`absolute top-0 left-0 right-0 py-1.5 text-center text-xs font-semibold ${p.highlight ? "bg-primary text-primary-foreground" : "bg-accent/20 text-accent-foreground"}`}>
                      {badge}
                    </div>
                  )}
                  <CardContent className={`p-6 text-center ${badge ? "pt-10" : ""}`}>
                    <h3 className="font-display font-semibold text-lg text-foreground">{p.label[lang]}</h3>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-sm text-foreground font-medium">{currencySymbol(lang)}</span>
                      <span className="font-display text-4xl font-bold text-foreground">{intPart}</span>
                      <span className="text-sm text-foreground font-medium">{lang === "pt" ? "," : "."}{decPart}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.period[lang]}</p>
                    <ul className="text-left space-y-2.5 my-6">
                      {t.pricingItems.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link to={`${CHECKOUT_URL}?plano=${p.key}`} className="block">
                      <Button variant={p.highlight ? "hero" : "outline"} size="lg" className="w-full group">
                        {t.pricingCta}
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            {t.pricingGuarantee}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">
            {t.faqTitle}
          </h2>
          <div className="space-y-3">
            {t.faqs.map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} id={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 bg-primary/5">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t.finalTitle}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {t.finalSub}
          </p>
          <Button asChild variant="hero" size="xl" className="group">
            <Link to={CHECKOUT_URL}>
              {t.finalCta}
              <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Evolua Plus · {t.footerRights}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t.footerDisclaimer}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Vendas;
