import { ReactNode } from "react";

/**
 * Cabeçalho único das páginas: título em Fraunces à esquerda, uma frase de apoio
 * e, opcionalmente, uma ação. Sem pílula, sem emoji, sem palavra colorida.
 */
type Props = { titulo: string; apoio?: ReactNode; acao?: ReactNode; sobretitulo?: string };

const CabecalhoPagina = ({ titulo, apoio, acao, sobretitulo }: Props) => (
  <header className="mb-6 anim-entrada">
    {sobretitulo && (
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">{sobretitulo}</p>
    )}
    <div className="flex items-end justify-between gap-4">
      <h1 className="font-display text-[2rem] leading-[1.1] font-semibold text-foreground">{titulo}</h1>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
    {apoio && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground max-w-prose">{apoio}</p>}
    <div className="mt-4 h-px bg-border" aria-hidden="true" />
  </header>
);

export default CabecalhoPagina;
