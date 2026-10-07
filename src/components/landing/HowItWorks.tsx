import { ClipboardList, Sparkles, LineChart } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Conte seus objetivos",
    desc: "Emagrecer, ganhar massa ou ter mais energia. Diga sua rotina, restrições e preferências em 2 minutos.",
  },
  {
    icon: Sparkles,
    title: "Nossa IA cria seu plano",
    desc: "Refeições, receitas, lista de compras e ajustes de macros — tudo montado sob medida em segundos.",
  },
  {
    icon: LineChart,
    title: "Acompanhe sua evolução",
    desc: "Peso, hidratação, calorias e hábitos com gráficos, streaks e insights que sustentam consistência.",
  },
];

const HowItWorks = () => (
  <section id="como-funciona" className="py-24 bg-background relative">
    <div className="container mx-auto max-w-6xl">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-semibold tracking-wide uppercase">
          Como funciona
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
          Do cadastro ao seu plano em <span className="text-gradient-primary">3 passos</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Sem planilhas. Sem cálculos manuais. A IA cuida da nutrição — você foca em executar.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div
          className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          aria-hidden
        />
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="relative group rounded-2xl bg-card border border-border/60 p-7 hover:border-primary/40 hover:shadow-premium transition-all duration-300 hover:-translate-y-1"
          >
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground flex items-center justify-center mb-5 shadow-glow group-hover:scale-105 transition-transform">
              <s.icon className="w-6 h-6" />
            </div>
            <span className="absolute top-6 right-6 font-display text-5xl font-bold text-primary/10 leading-none">
              0{i + 1}
            </span>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;