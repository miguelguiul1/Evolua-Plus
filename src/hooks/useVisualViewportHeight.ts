import { useEffect } from "react";

/**
 * Expõe a altura da área visível (`--vvh`, em px) enquanto o componente está montado.
 * No iPhone o teclado não muda `100dvh`, mas encolhe o `visualViewport`; com esta variável,
 * um layout em coluna (ex.: o chat) encolhe junto e o campo de digitação continua à vista.
 */
export const useVisualViewportHeight = () => {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const update = () => root.style.setProperty("--vvh", `${Math.round(vv?.height ?? window.innerHeight)}px`);
    update();
    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--vvh");
    };
  }, []);
};
