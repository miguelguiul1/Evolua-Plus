import { Clock, ChefHat, Target, ShoppingBasket, Zap, Repeat, HeartPulse, TrendingUp } from "lucide-react";

const benefits = [
  { icon: Clock, title: "Economize tempo", desc: "Pare de montar dietas manualmente. Seu plano nasce pronto em segundos." },
  { icon: Target, title: "Alimentação personalizada", desc: "Cada refeição é calculada para o seu objetivo, corpo e rotina." },
  { icon: Zap, title: "Sugestões inteligentes", desc: "A IA ajusta o cardápio conforme você come, treina ou muda a rotina." },
  { icon: TrendingUp, title: "Evolução acompanhada", desc: "Gráficos de peso, macros e hábitos com insights acionáveis." },
  { icon: HeartPulse, title: "Saúde de verdade", desc: "Base científica em nutrição, sem promessas milagrosas ou dietas restritivas." },
  { icon: ChefHat, title: "Receitas personalizadas", desc: "40+ receitas reais e acessíveis com ingredientes que você já usa." },
  { icon: ShoppingBasket, title: "Compras sem esforço", desc: "Lista organizada por categoria — do mercado direto para casa." },
  { icon: Repeat, title: "Substituições em 1 clique", desc: "Não gostou de um alimento? A IA troca sem quebrar o equilíbrio." },
];

const Benefits = () => (
  <section id="beneficios" className="py-24 bg-secondary/40 relative overflow-hidden">
    <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
    <div className="container mx-auto max-w-6xl relative">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-semibold tracking-wide uppercase">
          Benefícios
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
          Feito para <span className="text-gradient-primary">evoluir com você</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Menos fricção, mais resultado. Tudo o que você precisa em um só lugar.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((b) => (
          <div
            key={b.title}
            className="group bg-card rounded-2xl border border-border/60 p-6 hover:shadow-premium hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <b.icon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-foreground mb-1.5">{b.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Benefits;