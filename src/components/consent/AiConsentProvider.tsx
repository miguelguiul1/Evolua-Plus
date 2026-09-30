import { ReactNode, useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useConsent } from "@/hooks/useConsent";
import { CONSENT_TEXT } from "@/lib/consent";
import { AiConsentContext } from "./aiConsentContext";

/**
 * Antes de qualquer chamada de IA, `requireAiConsent()` confere a autorização. Sem ela, abre
 * um diálogo com a caixa (desmarcada) e só libera a chamada se a pessoa marcar e confirmar.
 * O servidor confere de novo (Edge Functions) — este diálogo é a porta de entrada, não a trava.
 */
export const AiConsentProvider = ({ children }: { children: ReactNode }) => {
  const { ai, health, update } = useConsent();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpen(false);
    setChecked(false);
  };

  const requireAiConsent = useCallback(() => {
    if (ai) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpen(true);
    });
  }, [ai]);

  const confirm = async () => {
    setSaving(true);
    try {
      // A tela de consentimento já exige dados de saúde; aqui só complementa se faltar.
      await update(health ? { ai_processing: true } : { health_data: true, ai_processing: true }, "app");
      finish(true);
    } catch (e) {
      toast.error("Não foi possível salvar a autorização", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AiConsentContext.Provider value={requireAiConsent}>
      {children}
      <Dialog open={open} onOpenChange={(o) => { if (!o) finish(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Autorizar o uso da IA</DialogTitle>
            <DialogDescription>
              Esta função envia dados a provedores de inteligência artificial. Veja detalhes na{" "}
              <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="consent-ai-dialog" className="flex gap-3 items-start cursor-pointer">
            <Checkbox id="consent-ai-dialog" checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-1" />
            <span className="text-sm">
              <span className="font-medium text-foreground">{CONSENT_TEXT.ai_processing.label}</span>
              <span className="block text-muted-foreground mt-1">{CONSENT_TEXT.ai_processing.detail}</span>
            </span>
          </label>
          <p className="text-xs text-muted-foreground">Você pode revogar a qualquer momento em Configurações → Privacidade.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => finish(false)}>Agora não</Button>
            <Button variant="hero" disabled={!checked || saving} onClick={confirm}>
              {saving ? "Salvando..." : "Autorizar e continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AiConsentContext.Provider>
  );
};
