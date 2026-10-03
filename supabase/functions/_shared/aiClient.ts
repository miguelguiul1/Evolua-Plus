/**
 * Único ponto de chamada de IA das Edge Functions.
 *
 * Provedor: Google Gemini pela API compatível com OpenAI (chat completions). As funções montam o
 * corpo (mensagens, max_tokens, temperature etc.) como antes; este módulo só acrescenta URL,
 * chave e modelo, que vêm de variáveis de ambiente:
 *
 * | Variável         | Obrigatória | Padrão                                                     |
 * |------------------|-------------|------------------------------------------------------------|
 * | `GEMINI_API_KEY` | sim         | —  (chave do Google AI Studio, cadastrada como secret)     |
 * | `AI_BASE_URL`    | não         | `https://generativelanguage.googleapis.com/v1beta/openai` |
 * | `AI_MODEL`       | não         | `gemini-2.5-flash`                                         |
 *
 * Trocar de modelo ou de provedor compatível com OpenAI = mudar só essas variáveis (ou o padrão
 * aqui). A resposta é devolvida crua (`Response`), então o tratamento de status de cada função
 * (429, 402, 500…) continua exatamente onde estava.
 */

export const DEFAULT_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const DEFAULT_AI_MODEL = "gemini-2.5-flash";

export type AiConfig = { baseUrl: string; apiKey: string; model: string };

type Env = { get(name: string): string | undefined };

/** Lê a configuração; `null` quando a chave não está configurada. */
export function getAiConfig(env: Env = Deno.env): AiConfig | null {
  const apiKey = env.get("GEMINI_API_KEY")?.trim();
  if (!apiKey) return null;
  const baseUrl = (env.get("AI_BASE_URL")?.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
  const model = env.get("AI_MODEL")?.trim() || DEFAULT_AI_MODEL;
  return { baseUrl, apiKey, model };
}

/** Igual a getAiConfig, mas lança se faltar a chave (as funções já tratam isso como erro 500). */
export function requireAiConfig(env: Env = Deno.env): AiConfig {
  const config = getAiConfig(env);
  if (!config) throw new Error("GEMINI_API_KEY não configurado");
  return config;
}

/** Corpo de chat completions sem `model` (o modelo vem da configuração). */
export type ChatCompletionBody = Record<string, unknown> & { messages: unknown[] };

/** POST {baseUrl}/chat/completions com Bearer. Devolve a Response sem interpretar. */
export function chatCompletion(
  config: AiConfig,
  body: ChatCompletionBody,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  return fetchFn(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, model: config.model }),
  });
}
