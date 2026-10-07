/**
 * Portabilidade e acesso (LGPD art. 18, II e V): monta um JSON com TODOS os dados da conta,
 * incluindo os arquivos das fotos de evolução (base64). Cobre as tabelas de LGPD_MAPA_DADOS.md.
 *
 * - Pagina cada tabela (o PostgREST devolve no máximo 1000 linhas por consulta).
 * - Tabela inexistente (migration pendente, ex.: user_consents) vira lista vazia, sem quebrar.
 * - Lista a pasta do usuário no Storage, e não só progress_photos, para incluir arquivos órfãos.
 */
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PROGRESS_BUCKET } from "@/lib/progressPhotos";
import { isMissingTableError } from "@/lib/consent";

const PAGE = 1000;

/** Tabela → chave no arquivo exportado → coluna do dono. */
export const EXPORT_TABLES: { table: string; key: string; owner: "id" | "user_id" }[] = [
  { table: "profiles", key: "perfil", owner: "id" },
  { table: "user_preferences", key: "preferencias", owner: "user_id" },
  { table: "user_routine_profile", key: "rotina", owner: "user_id" },
  { table: "user_goals", key: "metas", owner: "user_id" },
  { table: "weight_log", key: "evolucao", owner: "user_id" },
  { table: "progress_photos", key: "fotos_de_evolucao", owner: "user_id" },
  { table: "food_log", key: "diario_alimentar", owner: "user_id" },
  { table: "water_log", key: "hidratacao", owner: "user_id" },
  { table: "food_favorites", key: "alimentos_favoritos", owner: "user_id" },
  { table: "global_favorites", key: "favoritos", owner: "user_id" },
  { table: "meal_plans", key: "plano_alimentar", owner: "user_id" },
  { table: "scan_history", key: "historico_scanner", owner: "user_id" },
  { table: "chat_messages", key: "conversas_ia", owner: "user_id" },
  { table: "ai_memory", key: "memoria_ia", owner: "user_id" },
  { table: "ai_insights", key: "insights_ia", owner: "user_id" },
  { table: "user_consents", key: "consentimentos_historico", owner: "user_id" },
];

type PgError = { code?: string; message?: string } | null;
type Page = { data: unknown[] | null; error: PgError };
// Algumas tabelas ainda não estão nos tipos gerados; a consulta é a mesma para todas.
type LooseClient = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: string) => { range: (from: number, to: number) => Promise<Page> };
    };
  };
};

export const fetchAllRows = async (table: string, owner: string, userId: string): Promise<{ rows: unknown[]; error?: string }> => {
  const client = supabase as unknown as LooseClient;
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select("*").eq(owner, userId).range(from, from + PAGE - 1);
    if (error) {
      if (isMissingTableError(error) || error.code === "PGRST205") return { rows };
      return { rows, error: error.message ?? "erro desconhecido" };
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return { rows };
  }
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export type ExportedFile = { caminho: string; tipo: string; tamanho_bytes: number; base64?: string; erro?: string };

export const exportPhotoFiles = async (userId: string): Promise<ExportedFile[]> => {
  const bucket = supabase.storage.from(PROGRESS_BUCKET);
  const names: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list(userId, { limit: PAGE, offset });
    if (error || !data?.length) break;
    names.push(...data.filter((f) => f.id).map((f) => `${userId}/${f.name}`));
    if (data.length < PAGE) break;
  }
  const out: ExportedFile[] = [];
  for (const path of names) {
    const { data, error } = await bucket.download(path);
    if (error || !data) {
      out.push({ caminho: path, tipo: "", tamanho_bytes: 0, erro: error?.message ?? "não foi possível baixar" });
      continue;
    }
    out.push({ caminho: path, tipo: data.type, tamanho_bytes: data.size, base64: await blobToBase64(data) });
  }
  return out;
};

export const buildUserExport = async (user: User) => {
  const results = await Promise.all(EXPORT_TABLES.map((t) => fetchAllRows(t.table, t.owner, user.id)));
  const tabelas: Record<string, unknown[]> = {};
  const avisos: string[] = [];
  EXPORT_TABLES.forEach((t, i) => {
    tabelas[t.key] = results[i].rows;
    if (results[i].error) avisos.push(`${t.table}: ${results[i].error}`);
  });
  const arquivos = await exportPhotoFiles(user.id);
  arquivos.filter((f) => f.erro).forEach((f) => avisos.push(`arquivo ${f.caminho}: ${f.erro}`));

  return {
    formato: "evolua-plus-export/v2",
    exportado_em: new Date().toISOString(),
    conta: {
      id: user.id,
      email: user.email ?? null,
      criada_em: user.created_at,
      ultimo_login: user.last_sign_in_at ?? null,
      provedores_de_login: user.app_metadata?.providers ?? [],
      // Nome, consentimentos atuais e outros dados do cadastro.
      dados_do_cadastro: user.user_metadata ?? {},
    },
    ...tabelas,
    fotos_de_evolucao_arquivos: arquivos,
    avisos,
  };
};
