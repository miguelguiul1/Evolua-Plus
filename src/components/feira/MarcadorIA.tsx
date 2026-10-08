/** Marcador único e discreto para conteúdo gerado por IA: "IA" em versalete com ponto mostarda. */
const MarcadorIA = ({ className = "" }: { className?: string }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ${className}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
    IA
  </span>
);

export default MarcadorIA;
