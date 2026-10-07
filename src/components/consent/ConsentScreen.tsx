import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/useAuth";
import { useConsent } from "@/hooks/useConsent";
import { CONSENT_TEXT } from "@/lib/consent";

/**
 * Bloqueia o app até existir consentimento para dados de saúde (LGPD art. 11, I).
 * Aparece logo após o login, antes do onboarding, para qualquer forma de cadastro (e-mail ou
 * Google) e para contas antigas. Nenhuma caixa vem marcada. A caixa da IA é opcional aqui e
 * volta a ser pedida quando a pessoa usa uma função de IA.
 */
const ConsentScreen = () => {
  const { signOut } = useAuth();
  const { update } = useConsent();
  const [health, setHealth] = useState(false);
  const [ai, setAi] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!health) return;
    setSaving(true);
    try {
      await update({ health_data: true, ai_processing: ai }, "app");
      toast.success("Preferências de privacidade salvas");
    } catch (e) {
      toast.error("Não foi possível salvar", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-[var(--gutter)] py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-display font-semibold text-foreground">Seus dados de saúde</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          O Evolua Plus usa dados de saúde para funcionar. Pela LGPD, precisamos da sua autorização
          específica. Leia a{" "}
          <Link to="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>{" "}
          e os <Link to="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link>.
        </p>

        <div className="space-y-5">
          <label htmlFor="consent-health" className="flex gap-3 items-start cursor-pointer">
            <Checkbox id="consent-health" checked={health} onCheckedChange={(v) => { setHealth(v === true); if (v !== true) setAi(false); }} className="mt-1" />
            <span className="text-sm">
              <span className="font-medium text-foreground">{CONSENT_TEXT.health_data.label}</span>{" "}
              <span className="text-muted-foreground">(obrigatório para usar o app)</span>
              <span className="block text-muted-foreground mt-1">{CONSENT_TEXT.health_data.detail}</span>
            </span>
          </label>

          <label htmlFor="consent-ai" className={`flex gap-3 items-start ${health ? "cursor-pointer" : "opacity-60"}`}>
            <Checkbox id="consent-ai" checked={ai} disabled={!health} onCheckedChange={(v) => setAi(v === true)} className="mt-1" />
            <span className="text-sm">
              <span className="font-medium text-foreground">{CONSENT_TEXT.ai_processing.label}</span>{" "}
              <span className="text-muted-foreground">(opcional; necessário para as funções de IA)</span>
              <span className="block text-muted-foreground mt-1">{CONSENT_TEXT.ai_processing.detail}</span>
            </span>
          </label>
        </div>

        <Button variant="hero" size="lg" className="w-full mt-8" disabled={!health || saving} onClick={submit}>
          {saving ? "Salvando..." : "Continuar"}
        </Button>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-between text-sm">
          <Link to="/configuracoes" className="tap-link text-muted-foreground underline">
            Exportar ou excluir meus dados
          </Link>
          <button type="button" onClick={() => signOut()} className="text-muted-foreground underline text-left">
            Não concordo — sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentScreen;
