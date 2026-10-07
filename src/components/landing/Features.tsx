import {
  Sparkles,
  Camera,
  Utensils,
  BookOpen,
  Bot,
  LineChart,
  Library,
  CalendarRange,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "IA Nutricional",
    desc: "Recomendações personalizadas e ajustes automáticos em tempo real.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: CalendarRange,
    title: "Plano semanal",
    desc: "7 dias de refeições balanceadas montadas em segundos.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: Camera,
    title: "Scanner de geladeira",
    desc: "Fotografe o que tem em casa e receba receitas instantâneas.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: Utensils,
    title: "Diário alimentar",
    desc: "Descreva o que comeu — a IA calcula os macros automaticamente.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: Bot,
    title: "Assistente 24h",
    desc: "Tire dúvidas de nutrição, treino e hábitos a qualquer momento.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: LineChart,
    title: "Evolução visual",
    desc: "Gráficos de peso, hidratação e macros que revelam tendências.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: BookOpen,
    title: "Receitas curadas",
    desc: "40+ pratos acessíveis, com macros e passo-a-passo.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: Library,
    title: "Biblioteca científica",
    desc: "Guias, mitos e alimentos com evidências revisadas.",
    tint: "from-primary to-[hsl(var(--primary-glow))]",
  },
];

const Features = () => (
  <section id="recursos" className="py-24 bg-background">
    <div className="container mx-auto max-w-6xl">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-semibold tracking-wide uppercase">
          Recursos principais
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
          Tudo o que você precisa, <span className="text-gradient-primary">em um só app</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Uma plataforma completa que substitui apps, planilhas e consultas isoladas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-2xl bg-card border border-border/60 p-6 overflow-hidden hover:border-primary/30 transition-all duration-300"
          >
            <div className="absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
            <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${f.tint} text-primary-foreground flex items-center justify-center mb-4 shadow-soft`}>
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="relative font-display font-bold text-foreground mb-1.5">{f.title}</h3>
            <p className="relative text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;