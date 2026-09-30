/**
 * Teste da correção de alimentos proibidos com a IA REAL — SOMENTE no projeto de teste.
 *
 * Uso (na raiz):   deno run -A --no-lock scripts/test-ia-real.ts
 *
 * Lê .env.test (ignorado pelo git) e exige:
 *   VITE_SUPABASE_URL              → precisa ser https://laehlabpoayhkglhavfi.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY  → chave pública (anon) do projeto de teste
 *   TEST_USER_EMAIL / TEST_USER_PASSWORD → usuário de teste
 * Opcionais (variáveis de ambiente, nunca gravadas):
 *   SUPABASE_ACCESS_TOKEN → token pessoal da CLI, para contar "regeneração"/"SANITIZADA" nos logs
 *   FRIDGE_IMAGE          → caminho de uma foto simples de geladeira para testar analyze-fridge
 *
 * Segurança:
 * - Aborta se a URL não for do projeto de teste (nunca toca a produção).
 * - Nunca imprime senha, token ou chave.
 * - Guarda as preferências originais do usuário de teste e as restaura no final (mesmo com erro).
 * - Teto de 25 chamadas REAIS ao modelo, contando as regenerações internas (cabeçalho
 *   x-evolua-guard); uma requisição só é feita se o pior caso dela ainda couber no teto.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildForbiddenTerms,
  findForbiddenHits,
  scanForViolations,
  type Violation,
} from "../supabase/functions/_shared/foodPreferences.ts";
import { findChatViolations } from "../supabase/functions/_shared/recipeGuards.ts";

const TEST_REF = "laehlabpoayhkglhavfi";
const PROD_REF = "icmyqmvcwzdfleuxyiux";
const MAX_MODEL_CALLS = 25;
/** Pior caso de chamadas ao modelo por requisição (1 + regenerações). */
const WORST_CASE: Record<string, number> = { "meal-plan": 3, "meal-swap": 3, "analyze-fridge": 3, "nutrition-chat": 2 };
/** Limite de tempo de uma requisição de Edge Function (plano gratuito: 150 s). */
const FUNCTION_LIMIT_MS = 150_000;

const TEST_PREFS = {
  disliked_foods: ["Fígado", "Jiló", "Peixe", "Coentro", "Leite"],
  restrictions: ["Alergia a amendoim"],
};

// ---------------------------------------------------------------------------
// Configuração e travas
// ---------------------------------------------------------------------------

function loadEnvTest(): Record<string, string> {
  let text: string;
  try {
    text = Deno.readTextFileSync(".env.test");
  } catch {
    fail("Arquivo .env.test não encontrado na raiz do projeto.");
  }
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Só para ANTES de alterar dados (Deno.exit pula o finally que restaura as preferências). */
function fail(msg: string): never {
  console.error(`\nPARADO: ${msg}`);
  Deno.exit(1);
}

const env = loadEnvTest();
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? "";
const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
if (new URL(SUPABASE_URL || "http://x").hostname !== `${TEST_REF}.supabase.co` || SUPABASE_URL.includes(PROD_REF)) {
  fail(`VITE_SUPABASE_URL do .env.test não é o projeto de teste (${TEST_REF}).`);
}
if (!ANON_KEY) fail("Falta VITE_SUPABASE_PUBLISHABLE_KEY no .env.test.");
const missing = ["TEST_USER_EMAIL", "TEST_USER_PASSWORD"].filter((k) => !env[k]);
if (missing.length) fail(`Faltam no .env.test: ${missing.join(", ")}.`);
console.log(`Projeto alvo: ${TEST_REF} (teste). Produção (${PROD_REF}) bloqueada.`);

// ---------------------------------------------------------------------------
// Chamadas
// ---------------------------------------------------------------------------

type CallRecord = {
  fn: string;
  label: string;
  ms: number;
  status: number;
  attempts: number | null;
  regenerations: number | null;
  sanitized: boolean | null;
  finalViolations: { path: string; match: string; origin: string }[];
  leiteVegetal: number;
  note?: string;
  body?: unknown;
};

const records: CallRecord[] = [];
let modelCalls = 0;
const skipped: string[] = [];

const terms = buildForbiddenTerms(TEST_PREFS.disliked_foods, TEST_PREFS.restrictions);
const summarize = (v: Violation[]) => v.map((x) => ({ path: x.path, match: x.match, origin: x.term.origin }));
const countLeiteVegetal = (v: unknown) =>
  (JSON.stringify(v).match(/leite (?:de (?:am[eê]ndoas?|coco|aveia|soja|castanhas?|arroz)|vegetal)/giu) ?? []).length;

const parseGuard = (h: string | null) => {
  const m = h?.match(/attempts=(\d+);regenerations=(\d+);sanitized=(\d)/);
  return m ? { attempts: +m[1], regenerations: +m[2], sanitized: m[3] === "1" } : null;
};

async function invoke(fn: string, label: string, body: unknown, token: string): Promise<CallRecord | null> {
  if (modelCalls + WORST_CASE[fn] > MAX_MODEL_CALLS) {
    skipped.push(`${fn}: ${label} (teto de ${MAX_MODEL_CALLS} chamadas ao modelo)`);
    return null;
  }
  const started = performance.now();
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FUNCTION_LIMIT_MS + 15_000),
    });
  } catch (e) {
    modelCalls += WORST_CASE[fn]; // sem cabeçalho: conta o pior caso
    const rec: CallRecord = {
      fn, label, ms: performance.now() - started, status: 0, attempts: null, regenerations: null,
      sanitized: null, finalViolations: [], leiteVegetal: 0, note: `falha de rede: ${(e as Error).name}`,
    };
    records.push(rec);
    return rec;
  }
  const ms = performance.now() - started;
  const guard = parseGuard(res.headers.get("x-evolua-guard"));
  modelCalls += guard?.attempts ?? WORST_CASE[fn];
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* corpo não-JSON */
  }
  if (JSON.stringify(json ?? "").includes("(mock)")) {
    throw new Error(`${fn} respondeu com dados de MOCK — o secret MOCK_AI está ativo no projeto de teste. Rode: npx supabase@2 secrets set MOCK_AI=false --project-ref ${TEST_REF}`);
  }
  const rec: CallRecord = {
    fn, label, ms, status: res.status,
    attempts: guard?.attempts ?? null, regenerations: guard?.regenerations ?? null, sanitized: guard?.sanitized ?? null,
    finalViolations: [], leiteVegetal: countLeiteVegetal(json), body: json,
  };
  if (!res.ok) rec.note = `HTTP ${res.status}: ${(json as { error?: string })?.error ?? ""}`;
  records.push(rec);
  console.log(`  ${fn.padEnd(15)} ${label.padEnd(38)} ${String(res.status).padEnd(4)} ${(ms / 1000).toFixed(1).padStart(6)} s  ${res.headers.get("x-evolua-guard") ?? "(sem cabeçalho)"}`);
  return rec;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: true } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email: env.TEST_USER_EMAIL,
  password: env.TEST_USER_PASSWORD,
});
if (authError || !auth.session) fail(`login do usuário de teste falhou (${authError?.message ?? "sem sessão"}).`);
const userId = auth.user!.id;
const token = () => auth.session!.access_token;

const { data: original, error: readError } = await supabase
  .from("user_preferences")
  .select("objective, restrictions, liked_foods, disliked_foods")
  .eq("user_id", userId)
  .maybeSingle();
if (readError) fail(`não consegui ler as preferências originais (${readError.message}).`);
console.log(`Preferências originais guardadas (${original ? "linha existente" : "sem linha"}).`);

const startedAt = new Date();
try {
  const { error: setError } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      // meal-plan exige objetivo ou metas; mantém o original quando existe.
      objective: original?.objective ?? "maintenance",
      liked_foods: original?.liked_foods ?? [],
      ...TEST_PREFS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (setError) throw new Error(`não consegui configurar as preferências de teste (${setError.message}).`);

  console.log("\nChamadas:");
  for (let i = 1; i <= 5; i++) await invoke("meal-plan", `plano semanal #${i}`, {}, token());

  const swaps = [
    { tipo: "Café da manhã", nome: "Pão com manteiga e café com leite", calorias: 350, proteina: 10, carb: 45, gordura: 14 },
    { tipo: "Almoço", nome: "Tilápia grelhada com arroz e salada", calorias: 520, proteina: 40, carb: 50, gordura: 14 },
    { tipo: "Almoço", nome: "Frango com quiabo e angu", calorias: 560, proteina: 42, carb: 55, gordura: 16 },
    { tipo: "Lanche", nome: "Iogurte com granola e pasta de amendoim", calorias: 300, proteina: 15, carb: 30, gordura: 12 },
    { tipo: "Jantar", nome: "Sopa de legumes com coentro", calorias: 280, proteina: 12, carb: 35, gordura: 8 },
    { tipo: "Jantar", nome: "Omelete de queijo com tomate", calorias: 380, proteina: 25, carb: 6, gordura: 26 },
    { tipo: "Almoço", nome: "Bife de fígado acebolado com purê", calorias: 540, proteina: 38, carb: 40, gordura: 20 },
    { tipo: "Lanche", nome: "Vitamina de banana com aveia", calorias: 290, proteina: 9, carb: 50, gordura: 6 },
  ];
  for (const r of swaps) await invoke("meal-swap", `troca: ${r.nome.slice(0, 30)}`, { refeicao: r }, token());

  const questions = [
    "Me sugira um jantar",
    "Me passa uma receita com peixe",
    "O que comer no lanche?",
    "Ideia de café da manhã rápido",
    "Qual molho combina com frango?",
  ];
  for (const q of questions) await invoke("nutrition-chat", `chat: ${q}`, { messages: [{ role: "user", content: q }] }, token());

  const fridge = Deno.env.get("FRIDGE_IMAGE");
  if (fridge) {
    const bytes = Deno.readFileSync(fridge);
    const mime = /\.png$/i.test(fridge) ? "image/png" : "image/jpeg";
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    await invoke("analyze-fridge", "geladeira", { imageBase64: `data:${mime};base64,${btoa(bin)}` }, token());
  } else {
    skipped.push("analyze-fridge: sem imagem de teste (defina FRIDGE_IMAGE=caminho/da/foto.jpg)");
  }
} finally {
  // Restaura SEMPRE, mesmo com erro no meio.
  const restore = original
    ? await supabase.from("user_preferences").update({ ...original, updated_at: new Date().toISOString() }).eq("user_id", userId)
    : await supabase.from("user_preferences").delete().eq("user_id", userId);
  console.log(restore.error ? `\nATENÇÃO: falha ao restaurar preferências: ${restore.error.message}` : "\nPreferências originais restauradas.");
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Varredura do resultado FINAL (o que o usuário receberia)
// ---------------------------------------------------------------------------

for (const r of records) {
  if (r.status !== 200 || !r.body) continue;
  if (r.fn === "nutrition-chat") {
    const reply = String((r.body as { reply?: string }).reply ?? "");
    const q = r.label.replace(/^chat: /, "");
    const asked = new Set(findForbiddenHits(q, terms).map((h) => h.term.origin));
    r.finalViolations = findChatViolations(reply, terms.filter((t) => !asked.has(t.origin)))
      .map((h) => ({ path: "$.reply", match: h.match, origin: h.term.origin }));
  } else if (r.fn === "analyze-fridge") {
    r.finalViolations = summarize(scanForViolations((r.body as { receitas?: unknown }).receitas, terms, "$.receitas"));
  } else {
    r.finalViolations = summarize(scanForViolations(r.body, terms));
  }
}

// ---------------------------------------------------------------------------
// Logs (opcional)
// ---------------------------------------------------------------------------

let logCounts: string = "não consultado (defina SUPABASE_ACCESS_TOKEN para contar nos logs)";
const accessToken = Deno.env.get("SUPABASE_ACCESS_TOKEN");
if (accessToken) {
  try {
    const sql = "select event_message from function_logs order by timestamp desc limit 1000";
    const url = new URL(`https://api.supabase.com/v1/projects/${TEST_REF}/analytics/endpoints/logs.all`);
    url.searchParams.set("sql", sql);
    url.searchParams.set("iso_timestamp_start", startedAt.toISOString());
    url.searchParams.set("iso_timestamp_end", new Date().toISOString());
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    const msgs: string[] = (data.result ?? []).map((r: { event_message: string }) => r.event_message ?? "");
    const count = (re: RegExp) => msgs.filter((m) => re.test(m)).length;
    logCounts = res.ok
      ? `${msgs.length} linhas; "regeneração": ${count(/regenera/i)}; "SANITIZADA": ${count(/SANITIZADA/)}; "tentativa N: violação": ${count(/violação\(ões\)/)}`
      : `falhou (HTTP ${res.status})`;
  } catch (e) {
    logCounts = `falhou (${(e as Error).message})`;
  }
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

const byFn = (fn: string) => records.filter((r) => r.fn === fn);
const stats = (list: CallRecord[]) => {
  const ms = list.map((r) => r.ms);
  if (!ms.length) return "—";
  const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
  return `média ${(avg / 1000).toFixed(1)} s, mín ${(Math.min(...ms) / 1000).toFixed(1)} s, máx ${(Math.max(...ms) / 1000).toFixed(1)} s`;
};

console.log("\n================ RESUMO ================");
console.log(`Chamadas às funções: ${records.length} | chamadas ao modelo (cabeçalho): ${modelCalls}/${MAX_MODEL_CALLS}`);
for (const fn of ["meal-plan", "meal-swap", "nutrition-chat", "analyze-fridge"]) {
  const list = byFn(fn);
  if (!list.length) continue;
  const ok = list.filter((r) => r.status === 200).length;
  const regen = list.reduce((a, r) => a + (r.regenerations ?? 0), 0);
  const san = list.filter((r) => r.sanitized).length;
  const viol = list.reduce((a, r) => a + r.finalViolations.length, 0);
  const near = list.filter((r) => r.ms > FUNCTION_LIMIT_MS * 0.8).length;
  console.log(`- ${fn}: ${ok}/${list.length} ok | regenerações ${regen} | sanitizadas ${san} | violações no resultado final ${viol} | ${stats(list)}${near ? ` | ${near} perto do limite de ${FUNCTION_LIMIT_MS / 1000}s` : ""}`);
}
const allViolations = records.flatMap((r) => r.finalViolations.map((v) => ({ fn: r.fn, label: r.label, ...v })));
console.log(`Violações que chegaram ao resultado final: ${allViolations.length}`);
for (const v of allViolations) console.log(`   ${v.fn} / ${v.label} / ${v.path}: "${v.match}" (${v.origin})`);
console.log(`Menções a leite vegetal no resultado final (não bloqueadas): ${records.reduce((a, r) => a + r.leiteVegetal, 0)}`);
const errors = records.filter((r) => r.note);
for (const r of errors) console.log(`Erro: ${r.fn} / ${r.label}: ${r.note}`);
for (const s of skipped) console.log(`Pulado: ${s}`);
console.log(`Logs: ${logCounts}`);

const outFile = await Deno.makeTempFile({ prefix: "test-ia-real-", suffix: ".json" });
await Deno.writeTextFile(outFile, JSON.stringify({ startedAt, modelCalls, logCounts, skipped, records }, null, 2));
console.log(`\nRespostas completas (fora do repositório): ${outFile}`);
Deno.exit(allViolations.length ? 2 : 0);
