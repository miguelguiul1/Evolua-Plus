import { useEffect, useRef } from "react";
import { Folha, Grao, Tomate } from "./Formas";

/**
 * Fundo animado da landing (função: identidade).
 * Só transform; ciclos lentos de 18–24 s; pausa fora da tela e com a aba oculta;
 * parado com prefers-reduced-motion (regra em index.css). A página funciona sem ele.
 */
// Formas só na faixa de baixo do topo, longe do texto e do menu.
const FORMAS = [
  { C: Tomate, cls: "w-24 bottom-2 right-6 sm:w-28", dur: 22, dx: "-8px", dy: "-10px", rot: "5deg" },
  { C: Folha, cls: "w-16 bottom-6 left-4 rotate-[-30deg] sm:w-20", dur: 19, dx: "8px", dy: "-8px", rot: "-6deg" },
  { C: Grao, cls: "w-7 bottom-16 left-[34%]", dur: 24, dx: "6px", dy: "-8px", rot: "8deg" },
  { C: Grao, cls: "w-6 bottom-6 left-[46%] rotate-[40deg]", dur: 18, dx: "-6px", dy: "-6px", rot: "-6deg" },
  { C: Folha, cls: "w-10 bottom-20 right-[34%] rotate-[120deg]", dur: 21, dx: "-6px", dy: "-6px", rot: "4deg" },
];

const FundoFeira = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visivel = true;
    const aplicar = () => el.toggleAttribute("data-pausado", !visivel || document.hidden);
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; aplicar(); });
    io.observe(el);
    document.addEventListener("visibilitychange", aplicar);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", aplicar); };
  }, []);

  return (
    <div ref={ref} className="fundo-feira pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {FORMAS.map(({ C, cls, dur, dx, dy, rot }, i) => (
        <div key={i} className={`absolute ${cls}`}>
          <div
            className="forma-feira"
            style={{ animation: `feira-deriva ${dur}s ease-in-out infinite`, ["--dx" as string]: dx, ["--dy" as string]: dy, ["--rot" as string]: rot }}
          >
            <C className="w-full h-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default FundoFeira;
