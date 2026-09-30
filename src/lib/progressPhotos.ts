/**
 * Fotos de evolução no bucket privado "progress".
 *
 * `progress_photos.photo_url` guarda o CAMINHO no bucket (`<userId>/<arquivo>`), nunca uma URL
 * pública. A exibição usa URL assinada de curta duração, renovada antes de expirar.
 * `toStoragePath` também aceita uma URL completa (pública ou assinada) de registros antigos
 * ou inseridos à mão, para que continuem aparecendo mesmo com o bucket privado.
 */
import { supabase } from "@/integrations/supabase/client";

export const PROGRESS_BUCKET = "progress";
/** Validade da URL assinada (segundos). */
export const SIGNED_URL_TTL_S = 15 * 60;
/** Renova antes de expirar, com folga para relógio e rede. */
export const SIGNED_URL_REFRESH_MS = 12 * 60 * 1000;

export const toStoragePath = (photoUrl: string | null | undefined): string | null => {
  if (!photoUrl) return null;
  let value = photoUrl.trim();
  if (/^https?:\/\//i.test(value)) {
    const m = value.match(/\/object\/(?:public|sign|authenticated)\/progress\/([^?#]+)/i);
    if (!m) return null;
    value = m[1];
  }
  value = value.replace(/^\/+/, "").replace(/^progress\//, "");
  try {
    value = decodeURIComponent(value);
  } catch {
    /* mantém como veio */
  }
  return value || null;
};

/** Gera URLs assinadas indexadas pelo valor ORIGINAL de photo_url (como a UI consulta). */
export const signProgressPhotos = async (photoUrls: string[]): Promise<Record<string, string>> => {
  const byPath = new Map<string, string[]>();
  for (const url of photoUrls) {
    const path = toStoragePath(url);
    if (!path) continue;
    byPath.set(path, [...(byPath.get(path) ?? []), url]);
  }
  if (!byPath.size) return {};
  const { data, error } = await supabase.storage
    .from(PROGRESS_BUCKET)
    .createSignedUrls([...byPath.keys()], SIGNED_URL_TTL_S);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const s of data) {
    if (!s.signedUrl || !s.path) continue;
    for (const original of byPath.get(s.path) ?? []) map[original] = s.signedUrl;
  }
  return map;
};

/** Caminhos para remover do bucket (ignora valores que não apontam para "progress"). */
export const storagePathsOf = (photoUrls: string[]): string[] =>
  photoUrls.map(toStoragePath).filter((p): p is string => !!p);
