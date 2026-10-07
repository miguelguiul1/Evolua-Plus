import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const FinalCTA = () => (
  <section className="py-24 bg-background">
    <div className="container mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(143_64%_26%)] via-primary to-[hsl(var(--primary-glow))] p-10 sm:p-16 text-center shadow-premium">
        {/* Decorative glows */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          }}
          aria-hidden
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full bg-white/15 text-white font-display text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Comece agora
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight max-w-2xl mx-auto">
            Pronto para transformar sua alimentação?
          </h2>
          <p className="mt-4 text-white/80 text-lg max-w-xl mx-auto">
            Crie sua conta gratuita e receba seu primeiro plano em menos de 2 minutos.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="xl"
              className="bg-white text-primary hover:bg-white/90 shadow-glow font-display font-semibold"
            >
              <Link to="/auth">
                Começar Gratuitamente <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white hover:border-white/60"
            >
              <Link to="/vendas">Conhecer o Plus</Link>
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Sem cartão de crédito
            </span>
            <span>•</span>
            <span>Cancele quando quiser</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;