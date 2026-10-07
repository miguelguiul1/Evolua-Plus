import { Check, X } from "lucide-react";

const rows = [
  { feature: "Plano montado em segundos", byou: true, tradicional: false },
  { feature: "Personalização por objetivo, rotina e restrição", byou: true, tradicional: "parcial" as const },
  { feature: "Substituições inteligentes em 1 clique", byou: true, tradicional: false },
  { feature: "Lista de compras automática", byou: true, tradicional: false },
  { feature: "Scanner de geladeira", byou: true, tradicional: false },
  { feature: "Assistente 24h para dúvidas", byou: true, tradicional: false },
  { feature: "Evolução visual com gráficos", byou: true, tradicional: "parcial" as const },
  { feature: "Base científica em nutrição", byou: true, tradicional: true },
  { feature: "Custo acessível (a partir de R$29,90)", byou: true, tradicional: false },
];

const Cell = ({ v }: { v: boolean | "parcial" }) => {
  if (v === true)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary">
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
    );
  if (v === "parcial")
    return <span className="text-xs font-semibold text-muted-foreground">Parcial</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground/70">
      <X className="w-4 h-4" />
    </span>
  );
};

const Diferenciais = () => (
  <section id="diferenciais" className="py-24 bg-background">
    <div className="container mx-auto max-w-5xl">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-semibold tracking-wide uppercase">
          Diferenciais
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
          Evolua Plus <span className="text-gradient-primary">vs métodos tradicionais</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Por que trocar planilhas, apps genéricos e dietas manuais por uma plataforma inteligente.
        </p>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card shadow-soft overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] items-center px-6 py-4 border-b border-border/60 bg-secondary/40">
          <div className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider">Recurso</div>
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-display font-bold">
              Evolua Plus
            </div>
          </div>
          <div className="text-center text-sm font-display font-semibold text-muted-foreground">
            Métodos tradicionais
          </div>
        </div>

        {rows.map((r, i) => (
          <div
            key={r.feature}
            className={`grid grid-cols-[1.5fr_1fr_1fr] items-center px-6 py-4 ${
              i % 2 === 1 ? "bg-secondary/20" : ""
            }`}
          >
            <div className="text-sm font-medium text-foreground">{r.feature}</div>
            <div className="flex justify-center"><Cell v={r.byou} /></div>
            <div className="flex justify-center"><Cell v={r.tradicional} /></div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Diferenciais;