import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ds/ConfirmDialog";
import { useConsent } from "@/hooks/useConsent";
import { CONSENT_TEXT, CONSENT_VERSION, type ConsentPurpose } from "@/lib/consent";

const TITLE: Record<ConsentPurpose, string> = {
  health_data: "Tratamento dos dados de saúde",
  ai_processing: "Envio de dados ao provedor de IA (Google Gemini)",
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/** Ver, conceder e revogar os consentimentos (LGPD art. 8º, § 5º, e art. 18, IX). */
const ConsentSettings = () => {
  const { state, health, ai, update } = useConsent();
  const [busy, setBusy] = useState<ConsentPurpose | null>(null);

  const change = async (purpose: ConsentPurpose, granted: boolean) => {
    setBusy(purpose);
    try {
      await update({ [purpose]: granted }, "settings");
      toast.success(granted ? "Autorização registrada" : "Autorização revogada");
    } catch (e) {
      toast.error("Não foi possível salvar", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const active: Record<ConsentPurpose, boolean> = { health_data: health, ai_processing: ai };

  return (
    <div className="space-y-4">
      {(Object.keys(TITLE) as ConsentPurpose[]).map((p) => {
        const entry = state[p];
        const outdated = !!entry?.granted && entry.version !== CONSENT_VERSION;
        const status = active[p]
          ? `Autorizado em ${fmt(entry!.at)} (texto versão ${entry!.version})`
          : outdated
            ? `O texto mudou desde a sua autorização (versão ${entry!.version}). Autorize de novo para continuar.`
            : entry
              ? `Não autorizado (revogado em ${fmt(entry.at)})`
              : "Não autorizado";
        const needsHealthFirst = p === "ai_processing" && !health;
        return (
          <div key={p} className="rounded-xl border border-border/60 p-4">
            <p className="text-sm font-medium text-foreground">{TITLE[p]}</p>
            <p className={`text-xs mt-1 ${active[p] ? "text-primary" : "text-muted-foreground"}`}>{status}</p>
            <p className="text-xs text-muted-foreground mt-2">{CONSENT_TEXT[p].label}</p>
            <div className="mt-3">
              {active[p] ? (
                <ConfirmDialog
                  title={`Revogar: ${TITLE[p].toLowerCase()}?`}
                  description={CONSENT_TEXT[p].onRevoke}
                  confirmLabel="Revogar"
                  onConfirm={() => change(p, false)}
                  trigger={
                    <Button variant="outline" size="sm" disabled={busy !== null} className="text-destructive hover:text-destructive">
                      {busy === p ? "Salvando…" : "Revogar autorização"}
                    </Button>
                  }
                />
              ) : (
                <ConfirmDialog
                  title={TITLE[p]}
                  description={`${CONSENT_TEXT[p].label} ${CONSENT_TEXT[p].detail}`}
                  confirmLabel="Autorizo"
                  cancelLabel="Cancelar"
                  destructive={false}
                  onConfirm={() => change(p, true)}
                  trigger={
                    <Button variant="outline" size="sm" disabled={busy !== null || needsHealthFirst}>
                      {busy === p ? "Salvando…" : needsHealthFirst ? "Autorize os dados de saúde primeiro" : "Autorizar"}
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Revogar não apaga o que já foi guardado. Para isso, use “Exportar meus dados” ou “Excluir conta”
        acima, ou apague itens em{" "}
        <Link to="/memoria-ia" className="underline">Memória da IA</Link>. Detalhes na{" "}
        <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
      </p>
    </div>
  );
};

export default ConsentSettings;
