import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import {
  chatCompletion, DEFAULT_AI_BASE_URL, DEFAULT_AI_MODEL, getAiConfig, requireAiConfig,
} from "./aiClient.ts";
import { AIHttpError, generateWithGuard } from "./aiGuard.ts";

const env = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] });

/** fetch simulado: guarda a requisição e devolve a resposta configurada. */
function fakeFetch(respond: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
  const fn = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init!, body: JSON.parse(String(init!.body)) });
    return Promise.resolve(respond(url, init!));
  }) as typeof fetch;
  return { fn, calls };
}

const geminiOk = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), { status: 200 });

Deno.test("config: padrões do Gemini e chave obrigatória", () => {
  assertEquals(getAiConfig(env({})), null);
  assertEquals(getAiConfig(env({ GEMINI_API_KEY: "  " })), null);
  assertEquals(getAiConfig(env({ GEMINI_API_KEY: "k" })), { baseUrl: DEFAULT_AI_BASE_URL, apiKey: "k", model: DEFAULT_AI_MODEL });
  assertEquals(DEFAULT_AI_BASE_URL, "https://generativelanguage.googleapis.com/v1beta/openai");
  assertEquals(DEFAULT_AI_MODEL, "gemini-2.5-flash");
  assertThrows(() => requireAiConfig(env({})), Error, "GEMINI_API_KEY não configurado");
});

Deno.test("config: URL e modelo podem vir de variáveis (barra final é removida)", () => {
  const c = getAiConfig(env({ GEMINI_API_KEY: "k", AI_BASE_URL: "https://exemplo.test/v1/", AI_MODEL: "outro-modelo" }));
  assertEquals(c, { baseUrl: "https://exemplo.test/v1", apiKey: "k", model: "outro-modelo" });
});

Deno.test("chatCompletion: POST no endpoint, Bearer, modelo da config e corpo preservado", async () => {
  const { fn, calls } = fakeFetch(() => geminiOk("ok"));
  const config = requireAiConfig(env({ GEMINI_API_KEY: "chave-teste" }));
  const image = "data:image/jpeg;base64,AAAA";
  const res = await chatCompletion(config, {
    model: "google/gemini-2.5-flash", // valor antigo é ignorado: o modelo vem da config
    messages: [{ role: "user", content: [{ type: "text", text: "oi" }, { type: "image_url", image_url: { url: image } }] }],
    max_tokens: 500,
    temperature: 0.3,
    reasoning_effort: "none",
  }, fn);

  assertEquals(res.status, 200);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  assertEquals(calls[0].init.method, "POST");
  const h = calls[0].init.headers as Record<string, string>;
  assertEquals(h.Authorization, "Bearer chave-teste");
  assertEquals(h["Content-Type"], "application/json");
  assertEquals(calls[0].body.model, "gemini-2.5-flash");
  assertEquals(calls[0].body.max_tokens, 500);
  assertEquals(calls[0].body.temperature, 0.3);
  assertEquals(calls[0].body.reasoning_effort, "none");
  // a imagem segue no formato image_url com data URL, como o Gemini aceita
  const content = (calls[0].body.messages as { content: { image_url?: { url: string } }[] }[])[0].content;
  assertEquals(content[1].image_url?.url, image);
});

Deno.test("fluxo das funções com IA simulada: sucesso, regeneração e erro 429", async () => {
  const config = requireAiConfig(env({ GEMINI_API_KEY: "k" }));
  // Mesmo padrão de callAI das funções: chatCompletion → !ok vira AIHttpError → lê choices[0].
  const makeCallAI = (fetchFn: typeof fetch) => async (feedback: string | null) => {
    const response = await chatCompletion(config, {
      messages: [{ role: "user", content: feedback ?? "sugira um jantar" }],
    }, fetchFn);
    if (!response.ok) throw new AIHttpError(response.status, await response.text());
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";
  };
  const terms = [{ key: "peixe", origin: "Peixe", source: "disliked" as const, patterns: [] }];
  const scan = (v: string) => (v.includes("peixe") ? [{ term: terms[0] as never, path: "$", match: "peixe" }] : []);

  // 1ª resposta viola, 2ª vem limpa → 2 chamadas ao "Gemini".
  let n = 0;
  const seq = fakeFetch(() => geminiOk(n++ === 0 ? "jantar com peixe" : "jantar com frango"));
  const r = await generateWithGuard({
    label: "teste", terms: terms as never, callAI: makeCallAI(seq.fn),
    parse: (raw) => raw || null, scan: scan as never, sanitize: (v) => v.replaceAll("peixe", "frango"),
    logger: { warn: () => {}, error: () => {} },
  });
  assertEquals(r.value, "jantar com frango");
  assertEquals(seq.calls.length, 2);
  assertEquals(seq.calls.every((c) => c.body.model === "gemini-2.5-flash"), true);

  // 429 do provedor chega à função como AIHttpError(429), que ela já transforma em resposta 429.
  const limited = fakeFetch(() => new Response('{"error":{"code":429}}', { status: 429 }));
  const err = await assertRejects(() => makeCallAI(limited.fn)(null), AIHttpError);
  assertEquals((err as AIHttpError).status, 429);
});

// A checagem estática "nenhuma função chama o provedor por fora do módulo" fica em
// src/lib/aiProviderCentralized.test.ts (vitest), para o deno test seguir sem --allow-read.
