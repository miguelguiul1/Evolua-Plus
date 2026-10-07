import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/useAuth";
import {
  type ConsentPurpose,
  type ConsentState,
  consentsFromMetadata,
  consentsFromRows,
  fetchConsentRows,
  hasConsent,
  mergeConsents,
  recordConsents,
} from "@/lib/consent";

/** Estado do consentimento do usuário logado (user_metadata + histórico, vale o mais recente). */
export const useConsent = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ["user_consents", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: () => fetchConsentRows(user!.id),
  });

  const state: ConsentState = useMemo(
    () => mergeConsents(consentsFromMetadata(user?.user_metadata), consentsFromRows(rows)),
    [user?.user_metadata, rows],
  );

  const update = useCallback(
    async (changes: Partial<Record<ConsentPurpose, boolean>>, source: "app" | "settings" = "app") => {
      if (!user) throw new Error("Sessão expirada. Entre novamente.");
      const next = await recordConsents(user, changes, source);
      await qc.invalidateQueries({ queryKey: ["user_consents", user.id] });
      return next;
    },
    [user, qc],
  );

  return {
    state,
    /** Metadata já vem na sessão; o histórico só complementa. Não bloqueia a tela esperando por ele. */
    loading: !!user && rowsLoading && !hasConsent(consentsFromMetadata(user.user_metadata), "health_data"),
    health: hasConsent(state, "health_data"),
    ai: hasConsent(state, "health_data") && hasConsent(state, "ai_processing"),
    update,
  };
};
