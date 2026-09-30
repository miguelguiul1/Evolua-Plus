// Utilitários compartilhados de segurança para as Edge Functions do Evolua Plus.
import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Valida o JWT e devolve o user id. Nunca confie em ids enviados pelo cliente.
 *
 * getUser() verifica a assinatura/validade do token no servidor de autenticação —
 * NÃO apenas decodifica claims como getClaims(). Isso garante que um JWT forjado
 * ou expirado seja rejeitado mesmo se o gateway não tiver verificado (ex.: dev local).
 */
export async function requireUser(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
  const token = authHeader.slice(7);
  try {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data?.user?.id) return json({ error: "Sessão inválida ou expirada" }, 401);
    return { userId: data.user.id };
  } catch {
    return json({ error: "Sessão inválida ou expirada" }, 401);
  }
}

/** Rate limit simples em memória (por instância). Evita abuso das rotas de IA. */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs = 60_000): Response | null {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    return json({ error: "Muitas requisições. Aguarde um instante e tente novamente." }, 429);
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return null;
}

/** Limite de corpo para funções que só recebem texto (as de imagem usam o padrão de readJson). */
export const TEXT_BODY_MAX = 256_000;

/** Garante que o corpo não é gigante. */
export async function readJson(req: Request, maxBytes = 12_000_000): Promise<unknown | Response> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len && len > maxBytes) return json({ error: "Conteúdo muito grande." }, 413);
  const text = await req.text();
  if (text.length > maxBytes) return json({ error: "Conteúdo muito grande." }, 413);
  try {
    return JSON.parse(text);
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }
}

/** Valida imagem base64 data-url e tamanho. */
export function validateImage(value: unknown, maxBytes = 8_000_000): Response | null {
  if (typeof value !== "string" || !/^data:image\/(png|jpe?g|webp|heic|heif);base64,/i.test(value)) {
    return json({ error: "Imagem inválida. Envie uma foto JPG, PNG ou WEBP." }, 400);
  }
  if (value.length * 0.75 > maxBytes) return json({ error: "Imagem muito grande (máx. 8MB)." }, 413);
  return null;
}

/** Limita textos livres antes de ir para a IA. */
export function clampText(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Número finito ou null — nunca repassa texto arbitrário do cliente para o prompt. */
export function clampNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Lista de strings do cliente, limitada em itens e em caracteres por item. */
export function clampStringList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.slice(0, maxLen))
    .slice(0, maxItems);
}

export const isResponse = (v: unknown): v is Response => v instanceof Response;
