/**
 * Kit de formas "Feira": tomate, folha, grão e prato.
 * Formas simples e geométricas em SVG, sempre as mesmas, coloridas pelos tokens
 * (mudam sozinhas no modo escuro). Decorativas: aria-hidden por padrão.
 */
type FormaProps = { className?: string; title?: string };

const svgProps = (title?: string) =>
  title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: false as const };

export const Tomate = ({ className, title }: FormaProps) => (
  <svg viewBox="0 0 100 100" className={className} {...svgProps(title)}>
    <circle cx="50" cy="57" r="36" fill="hsl(var(--tomate))" />
    <path
      d="M50 24 L55 13 L57 25 L69 21 L60 30 L50 28 L40 30 L31 21 L43 25 L45 13 Z"
      fill="hsl(var(--folha))"
    />
    <path d="M30 50 Q34 40 44 37" stroke="hsl(var(--papel))" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
);

export const Folha = ({ className, title }: FormaProps) => (
  <svg viewBox="0 0 100 100" className={className} {...svgProps(title)}>
    <path d="M50 6 C82 24 86 70 50 94 C14 70 18 24 50 6 Z" fill="hsl(var(--folha))" />
    <path
      d="M50 16 V86 M50 40 L36 30 M50 40 L64 30 M50 58 L33 46 M50 58 L67 46 M50 74 L38 66 M50 74 L62 66"
      stroke="hsl(var(--papel))" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" fill="none"
    />
  </svg>
);

export const Grao = ({ className, title }: FormaProps) => (
  <svg viewBox="0 0 100 100" className={className} {...svgProps(title)}>
    <ellipse cx="50" cy="50" rx="22" ry="34" fill="hsl(var(--mostarda))" />
    <path d="M50 22 Q42 50 50 78" stroke="hsl(var(--tinta))" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

export const Prato = ({ className, title }: FormaProps) => (
  <svg viewBox="0 0 100 100" className={className} {...svgProps(title)}>
    <circle cx="50" cy="50" r="45" fill="hsl(var(--cartao))" stroke="hsl(var(--tinta))" strokeWidth="3" />
    <circle cx="50" cy="50" r="31" fill="none" stroke="hsl(var(--borda-suave))" strokeWidth="3" />
  </svg>
);

/** Composição do kit usada no lugar de foto enquanto não houver fotografia real. */
export const MesaPosta = ({ className, title = "Ilustração: prato com tomate, folha e grãos" }: FormaProps) => (
  <svg viewBox="0 0 320 220" className={className} role="img" aria-label={title}>
    <rect x="0" y="0" width="320" height="220" rx="16" fill="hsl(var(--secondary))" />
    <g transform="translate(70 20)">
      <circle cx="90" cy="90" r="82" fill="hsl(var(--cartao))" stroke="hsl(var(--tinta))" strokeWidth="4" />
      <circle cx="90" cy="90" r="58" fill="none" stroke="hsl(var(--borda-suave))" strokeWidth="4" />
    </g>
    <g transform="translate(118 64) scale(.62)">
      <circle cx="50" cy="57" r="36" fill="hsl(var(--tomate))" />
      <path d="M50 24 L55 13 L57 25 L69 21 L60 30 L50 28 L40 30 L31 21 L43 25 L45 13 Z" fill="hsl(var(--folha))" />
    </g>
    <g transform="translate(160 78) rotate(28) scale(.6)">
      <path d="M50 6 C82 24 86 70 50 94 C14 70 18 24 50 6 Z" fill="hsl(var(--folha))" />
      <path d="M50 16 V86" stroke="hsl(var(--papel))" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
    </g>
    {[ [140, 132, -20], [156, 142, 15], [172, 130, 40], [188, 140, -10] ].map(([x, y, r]) => (
      <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="6" ry="9" transform={`rotate(${r} ${x} ${y})`} fill="hsl(var(--mostarda))" />
    ))}
    <rect x="22" y="58" width="10" height="110" rx="5" fill="hsl(var(--tinta))" opacity=".8" />
    <rect x="288" y="58" width="10" height="110" rx="5" fill="hsl(var(--tinta))" opacity=".8" />
  </svg>
);
