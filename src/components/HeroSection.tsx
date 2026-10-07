import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, Star, Zap, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardMockup from "./landing/DashboardMockup";

const HeroSection = () => {
  const scrollTo = (id: string) => () =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative min-h-[92dvh] flex items-center overflow-hidden hero-radial pt-28 pb-20">
      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.25] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--primary) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 container mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr,1fr] gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <div className="min-w-0 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full glass border border-primary/15 text-primary font-display text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Powered by AI · Nutrição inteligente 24h
            </span>
          </div>

          <h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-foreground animate-fade-up"
            style={{ animationDelay: "0.08s" }}
          >
            Transforme sua alimentação com{" "}
            <span className="relative inline-block">
              <span className="text-gradient-primary">Inteligência Artificial</span>
              <svg
                className="absolute -bottom-2 left-0 w-full h-2 text-primary/40"
                viewBox="0 0 200 8"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path d="M0 4 Q 50 0 100 4 T 200 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.16s" }}
          >
            Plano alimentar, receitas e lista de compras montados pela nossa IA em segundos —
            adaptados ao seu objetivo, rotina e restrições. Simples como um app. Preciso como um nutricionista.
          </p>

          <div
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-fade-up"
            style={{ animationDelay: "0.24s" }}
          >
            <Button asChild variant="premium" size="xl">
              <Link to="/auth">
                Começar Gratuitamente <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" onClick={scrollTo("demonstracao")} className="group">
              <PlayCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              Ver Demonstração
            </Button>
          </div>

          {/* Trust indicators */}
          <div
            className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto lg:mx-0 animate-fade-up"
            style={{ animationDelay: "0.32s" }}
          >
            <TrustItem icon={<Sparkles className="w-4 h-4 text-primary" />} label="IA" sub="nutrição inteligente" />
            <TrustItem icon={<Star className="w-4 h-4 text-[hsl(38_92%_55%)]" />} label="Personalizado" sub="para o seu objetivo" />
            <TrustItem icon={<Zap className="w-4 h-4 text-primary" />} label="Segundos" sub="plano gerado" />
            <TrustItem icon={<ShieldCheck className="w-4 h-4 text-primary" />} label="Beta grátis" sub="sem cartão" />
          </div>
        </div>

        {/* Mockup */}
        <div
          className="relative min-w-0 w-full max-w-xl mx-auto lg:mx-0 animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          <DashboardMockup className="relative lg:rotate-1 hover:rotate-0 transition-transform duration-700 shadow-premium" />

          <div className="hidden md:flex absolute -left-6 top-20 items-center gap-2 rounded-full glass border border-border/60 shadow-soft px-3 py-1.5 text-xs font-display font-semibold text-foreground animate-float-slow">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
              <span className="relative rounded-full h-2 w-2 bg-primary" />
            </span>
            IA em ação
          </div>
          <div className="hidden md:flex absolute -right-4 bottom-16 items-center gap-2 rounded-2xl glass border border-border/60 shadow-soft px-3 py-2 animate-float">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <p className="text-[10px] text-muted-foreground">Novo plano</p>
              <p className="text-xs font-display font-bold text-foreground">gerado agora</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TrustItem = ({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) => (
  <div className="flex flex-col items-center lg:items-start gap-1">
    {icon}
    <p className="font-display text-sm font-bold text-foreground leading-none">{label}</p>
    <p className="text-[11px] text-muted-foreground">{sub}</p>
  </div>
);

export default HeroSection;
