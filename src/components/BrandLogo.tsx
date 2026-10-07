import { forwardRef } from "react";
// WebP de 416x240 (~24 KB), gerado do PNG de alta resolução (fonte dos ícones, não vai para o app).
import logoMark from "@/assets/logo-evolua-mark.webp";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const markSize: Record<Size, string> = {
  sm: "h-7 w-auto",
  md: "h-9 w-auto",
  lg: "h-16 w-auto sm:h-20",
};

const textSize: Record<Size, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl sm:text-4xl",
};

interface BrandLogoProps {
  size?: Size;
  showWordmark?: boolean;
  className?: string;
}

const BrandLogo = forwardRef<HTMLSpanElement, BrandLogoProps>(({ size = "sm", showWordmark = true, className }, ref) => (
  <span ref={ref} className={cn("inline-flex items-center gap-2", className)}>
    <img
      src={logoMark}
      width={416}
      height={240}
      alt="Evolua Plus"
      className={cn(markSize[size], "shrink-0 object-contain")}
      loading="eager"
      decoding="async"
    />
    {showWordmark && (
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground leading-none",
          textSize[size]
        )}
      >
        Evolua<span className="text-primary">+</span>
      </span>
    )}
  </span>
));
BrandLogo.displayName = "BrandLogo";

export default BrandLogo;
