import { Star, Quote } from "lucide-react";

const stats = [
  { value: "1.000+", label: "Planos gerados" },
  { value: "4,9/5", label: "Satisfação média" },
  { value: "95%", label: "Recomendam" },
  { value: "24/7", label: "Assistente IA disponível" },
];

// Placeholder testimonials — substituir por depoimentos reais assim que disponíveis.
const testimonials = [
  {
    name: "Ana C.",
    role: "Designer · São Paulo",
    text: "Em 2 minutos tinha um plano melhor do que qualquer app pago que já usei. A lista de compras me salvou horas por semana.",
    initials: "AC",
  },
  {
    name: "Rafael M.",
    role: "Engenheiro · Rio de Janeiro",
    text: "Ganhei massa comendo comida de verdade. A IA ajusta os macros conforme meus treinos e a evolução aparece nos gráficos.",
    initials: "RM",
  },
  {
    name: "Juliana P.",
    role: "Médica · Belo Horizonte",
    text: "Como profissional de saúde, gosto que o app é sério, tem base científica e não vende milagres. Recomendo aos pacientes.",
    initials: "JP",
  },
  {
    name: "Bruno T.",
    role: "Professor · Curitiba",
    text: "O scanner de geladeira é viciante — bato uma foto e tenho três receitas prontas com o que tenho em casa.",
    initials: "BT",
  },
  {
    name: "Camila S.",
    role: "Empreendedora · Fortaleza",
    text: "Consegui organizar minha alimentação sem viver contando calorias. O assistente IA responde qualquer dúvida em segundos.",
    initials: "CS",
  },
  {
    name: "Diego L.",
    role: "Programador · Porto Alegre",
    text: "Interface impecável, muito mais elegante que os concorrentes. Vale cada centavo do plano anual.",
    initials: "DL",
  },
];

const SocialProof = () => (
  <section className="py-24 bg-background">
    <div className="container mx-auto max-w-6xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
        {stats.map((s) => (
          <div key={s.label} className="text-center rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/30 transition-colors">
            <div className="font-display text-3xl sm:text-4xl font-bold text-gradient-primary">
              {s.value}
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground -mt-12 mb-12">
        Números e depoimentos a seguir são ilustrativos (demonstração) — ainda não há clientes reais cadastrados.
      </p>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-semibold tracking-wide uppercase">
          Depoimentos
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
          Depoimentos <span className="text-gradient-primary">ilustrativos</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Exemplos de uso do Evolua Plus para demonstrar o produto.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="group relative rounded-2xl border border-border/60 bg-card p-7 hover:border-primary/30 hover:shadow-premium hover:-translate-y-1 transition-all duration-300"
          >
            <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="w-4 h-4 fill-[hsl(38_92%_55%)] text-[hsl(38_92%_55%)]" />
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-5">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] text-primary-foreground flex items-center justify-center text-xs font-display font-bold">
                {t.initials}
              </div>
              <div>
                <p className="font-display font-semibold text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SocialProof;