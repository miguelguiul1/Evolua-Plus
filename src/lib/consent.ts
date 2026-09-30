/**
 * Consentimento LGPD para dados de saúde (art. 11, I) e para envio desses dados à IA.
 *
 * Onde fica registrado:
 * - `auth.users.user_metadata.consents`: estado ATUAL de cada finalidade. As Edge Functions
 *   consultam este campo (via `auth.getUser`, no servidor) antes de chamar a IA. Funciona sem
 *   migration.
 * - `public.user_consents`: HISTÓRICO só de inserção (cada concessão/revogação vira uma linha).
 *   Vem da migration em supabase/migrations_pendentes/. Enquanto ela não for aplicada, a gravação
 *   no histórico é ignorada sem quebrar o app (o estado continua no user_metadata).
 *
 * TEXTOS: RASCUNHO para revisão jurídica. Ao mudar o texto, suba CONSENT_VERSION. Quem consentiu
 * numa versão anterior é convidado a consentir de novo.
 */
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const CONSENT_VERSION = "2026-09-30";

export type ConsentPurpose = "health_data" | "ai_processing";
export const CONSENT_PURPOSES: ConsentPurpose[] = ["health_data", "ai_processing"];

export type ConsentEntry = { granted: boolean; version: string; at: string };
export type ConsentState = Record<ConsentPurpose, ConsentEntry | null>;

export const CONSENT_TEXT: Record<ConsentPurpose, { label: string; detail: string; onRevoke: string }> = {
  health_data: {
    label:
      "Autorizo o Evolua Plus a tratar meus dados de saúde (peso, medidas, % de gordura, fotos de evolução, idade, sexo, altura, alimentação, restrições e alergias, rotina e treino) para calcular metas e personalizar meu acompanhamento.",
    detail:
      "Esses dados ficam guardados na sua conta, com regras de acesso que impedem outras contas de vê-los. Você pode revogar esta autorização, exportar ou excluir seus dados a qualquer momento em Configurações.",
    onRevoke:
      "Sem esta autorização o app para de funcionar para você: não é possível registrar peso, medidas, fotos, diário ou metas, nem gerar planos. Os dados já guardados continuam na sua conta até você excluí-los em Configurações. A autorização para a IA também será revogada.",
  },
  ai_processing: {
    label:
      "Autorizo o envio dos meus dados de saúde e alimentação aos provedores de inteligência artificial (Lovable AI Gateway, Google Gemini e OpenAI) para gerar planos, respostas do assistente, análises de fotos e estimativas nutricionais.",
    detail:
      "Só vai para a IA o necessário para cada função (por exemplo: objetivo, metas, restrições, a foto enviada ou a sua pergunta). Seu nome e seu e-mail não são enviados. Esses provedores podem processar os dados fora do Brasil.",
    onRevoke:
      "Sem esta autorização deixam de funcionar: assistente de IA, plano alimentar e troca de refeição, scanner de alimentos, porções e geladeira, verificador de mitos, estimativa automática de calorias no diário e análise do dia. O restante do app continua funcionando.",
  },
};

const emptyState = (): ConsentState => ({ health_data: null, ai_processing: null });

const isEntry = (v: unknown): v is ConsentEntry => {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return typeof e.granted === "boolean" && typeof e.version === "string" && typeof e.at === "string";
};

/** Estado registrado no user_metadata (o que o servidor consulta). */
export const consentsFromMetadata = (metadata: unknown): ConsentState => {
  const state = emptyState();
  const raw = (metadata as Record<string, unknown> | null | undefined)?.consents;
  if (typeof raw !== "object" || raw === null) return state;
  for (const p of CONSENT_PURPOSES) {
    const v = (raw as Record<string, unknown>)[p];
    if (isEntry(v)) state[p] = v;
  }
  return state;
};

export type ConsentRow = { purpose: string; granted: boolean; text_version: string; created_at: string };

/** Linha mais recente de cada finalidade no histórico. */
export const consentsFromRows = (rows: ConsentRow[]): ConsentState => {
  const state = emptyState();
  for (const r of rows) {
    if (r.purpose !== "health_data" && r.purpose !== "ai_processing") continue;
    const current = state[r.purpose];
    if (!current || r.created_at > current.at) {
      state[r.purpose] = { granted: r.granted, version: r.text_version, at: r.created_at };
    }
  }
  return state;
};

/** Junta as duas fontes: vale o registro mais recente de cada finalidade. */
export const mergeConsents = (a: ConsentState, b: ConsentState): ConsentState => {
  const out = emptyState();
  for (const p of CONSENT_PURPOSES) {
    const x = a[p];
    const y = b[p];
    out[p] = !x ? y : !y ? x : new Date(y.at).getTime() > new Date(x.at).getTime() ? y : x;
  }
  return out;
};

/** Consentimento válido: concedido e na versão atual do texto. */
export const hasConsent = (state: ConsentState, purpose: ConsentPurpose): boolean => {
  const e = state[purpose];
  return !!e && e.granted && e.version === CONSENT_VERSION;
};

/** Erro de tabela inexistente (migration ainda não aplicada) — PostgREST ou Postgres. */
export const isMissingTableError = (error: { code?: string; message?: string } | null | undefined) =>
  !!error && (error.code === "PGRST205" || error.code === "42P01" || /user_consents/.test(error.message ?? ""));

/** Lê o histórico; devolve [] se a tabela ainda não existir. */
export const fetchConsentRows = async (userId: string): Promise<ConsentRow[]> => {
  // Tabela fora dos tipos gerados até a migration ser aplicada.
  const client = supabase as unknown as {
    from: (t: "user_consents") => {
      select: (c: string) => {
        eq: (col: "user_id", v: string) => Promise<{ data: ConsentRow[] | null; error: { code?: string; message?: string } | null }>;
      };
    };
  };
  const { data, error } = await client
    .from("user_consents")
    .select("purpose, granted, text_version, created_at")
    .eq("user_id", userId);
  if (error) {
    if (!isMissingTableError(error)) console.warn("Não foi possível ler o histórico de consentimento:", error.message);
    return [];
  }
  return data ?? [];
};

/**
 * Registra conceder/revogar. Revogar dados de saúde revoga também a IA (a IA usa esses dados).
 * Ordem: 1) user_metadata (obrigatório — é o que libera ou bloqueia a IA no servidor);
 *        2) histórico em user_consents (melhor esforço; tabela pode não existir ainda).
 */
export const recordConsents = async (
  user: User,
  changes: Partial<Record<ConsentPurpose, boolean>>,
  source: "app" | "settings",
): Promise<ConsentState> => {
  const effective = { ...changes };
  if (effective.health_data === false) effective.ai_processing = false;

  const at = new Date().toISOString();
  const current = consentsFromMetadata(user.user_metadata);
  const next: ConsentState = { ...current };
  for (const p of CONSENT_PURPOSES) {
    if (effective[p] !== undefined) next[p] = { granted: effective[p] as boolean, version: CONSENT_VERSION, at };
  }

  const { error } = await supabase.auth.updateUser({ data: { consents: next } });
  if (error) throw error;

  const rows = CONSENT_PURPOSES.filter((p) => effective[p] !== undefined).map((p) => ({
    user_id: user.id,
    purpose: p,
    granted: effective[p] as boolean,
    text_version: CONSENT_VERSION,
    source,
  }));
  if (rows.length) {
    const client = supabase as unknown as {
      from: (t: "user_consents") => { insert: (r: typeof rows) => Promise<{ error: { code?: string; message?: string } | null }> };
    };
    const { error: histError } = await client.from("user_consents").insert(rows);
    if (histError && !isMissingTableError(histError)) {
      console.warn("Consentimento salvo, mas o histórico não foi gravado:", histError.message);
    }
  }
  return next;
};
