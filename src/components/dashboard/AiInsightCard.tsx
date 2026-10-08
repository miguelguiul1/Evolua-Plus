import { useState } from "react";
import { Link } from "react-router-dom";
import { X, ChevronRight, ShieldCheck } from "lucide-react";
import MarcadorIA from "@/components/feira/MarcadorIA";
import { useAiInsights } from "@/hooks/useAiInsights";
import { Button } from "@/components/ui/button";

const AiInsightCard = () => {
  const { loading, current, dismiss } = useAiInsights();
  const [open, setOpen] = useState(false);

  // Dica da IA fica em segundo plano: só aparece quando existe uma.
  if (loading || !current) return null;

  return (
    <div className="relative bg-card rounded-2xl border border-border p-5 overflow-hidden">
      <button
        onClick={() => dismiss.mutate(current)}
        aria-label="Ignorar insight"
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="min-w-0 pr-6">
          <p className="flex items-center gap-2 font-display font-semibold text-foreground">Uma dica para hoje <MarcadorIA /></p>
          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{current.message}</p>

          {open && (
            <div className="mt-3 rounded-xl bg-secondary/60 p-3 space-y-2 animate-in fade-in duration-200">
              <p className="text-xs text-muted-foreground leading-relaxed">{current.detail}</p>
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Informativo — não substitui nutricionista ou médico.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setOpen((v) => !v)}>
              {open ? "Ocultar" : "Ver detalhes"}
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 text-xs text-primary">
              <Link to={current.route}>
                Abrir <ChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
            <button
              onClick={() => dismiss.mutate(current)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiInsightCard;