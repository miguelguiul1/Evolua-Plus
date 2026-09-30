/**
 * Smoke test das Edge Functions SEM Docker, SEM Supabase real e SEM IA real.
 *
 * Sobe um "Supabase" falso em localhost (auth + tabelas com dados fixos), executa o
 * index.ts REAL de meal-plan e meal-swap com MOCK_AI=true e confere que a resposta HTTP
 * não contém nenhum alimento proibido. Serve para quando `supabase functions serve` não
 * está disponível (ele exige Docker).
 *
 * Uso (na raiz do projeto):  deno run -A --no-lock scripts/smoke-edge-functions.ts
 */
import { buildForbiddenTerms, findForbiddenHits } from "../supabase/functions/_shared/foodPreferences.ts";

const FAKE_PORT = 54329;
const FUNCTION_URL = "http://localhost:8000"; // porta padrão do serve() do std@0.168

const PREFS = {
  objective: "weight_loss",
  restrictions: ["Alergia a amendoim"],
  liked_foods: ["Frango", "Banana"],
  // Frango e espinafre aparecem no plano mock; peixe (atum) também.
  disliked_foods: ["Frango", "Espinafre", "Peixe"],
};

const TABLES: Record<string, unknown> = {
  profiles: { age: 30, sex: "feminino", height_cm: 165, activity_level: "moderado" },
  user_preferences: PREFS,
  user_goals: { calories_goal: 1900, protein_goal: 120, carbs_goal: 200, fat_goal: 60 },
  weight_log: { weight_kg: 70 },
  user_routine_profile: null,
  ai_memory: [],
};

/** Supabase falso: só o que as funções usam (GET /auth/v1/user e SELECTs do PostgREST). */
const fake = Deno.serve({ port: FAKE_PORT, onListen: () => {} }, (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/auth/v1/user") {
    return Response.json({ id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated" });
  }
  const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)/)?.[1];
  if (table && table in TABLES) return Response.json(TABLES[table]);
  return new Response("not found", { status: 404 });
});

async function runFunction(name: string, body: unknown) {
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "--no-lock", `supabase/functions/${name}/index.ts`],
    env: {
      SUPABASE_URL: `http://localhost:${FAKE_PORT}`,
      SUPABASE_ANON_KEY: "fake-anon-key",
      MOCK_AI: "true",
    },
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  let logs = "";
  const decoder = new TextDecoder();
  const drain = async (stream: ReadableStream<Uint8Array>) => {
    for await (const chunk of stream) logs += decoder.decode(chunk);
  };
  const drains = [drain(child.stdout), drain(child.stderr)];

  try {
    // Espera a função subir.
    for (let i = 0; i < 100; i++) {
      try {
        await (await fetch(FUNCTION_URL, { method: "OPTIONS" })).body?.cancel();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { Authorization: "Bearer fake-user-token", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json(), logs: () => logs };
  } finally {
    child.kill();
    await child.status;
    await Promise.allSettled(drains);
  }
}

const terms = buildForbiddenTerms(PREFS.disliked_foods, PREFS.restrictions);
let failed = false;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "OK  " : "FALHA"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed = true;
};

// meal-plan: o plano mock tem "Omelete de espinafre", "Frango grelhado" e "Sanduíche de atum".
const plan = await runFunction("meal-plan", {});
check("meal-plan responde 200", plan.status === 200, `status ${plan.status}`);
const planHits = findForbiddenHits(JSON.stringify(plan.json), terms).map((h) => h.match);
check("meal-plan sem alimento proibido", planHits.length === 0, planHits.join(", "));
const segunda = plan.json?.plano?.[0]?.refeicoes ?? [];
check("meal-plan mantém 7 dias e 4 refeições", plan.json?.plano?.length === 7 && segunda.length === 4);
check("meal-plan promoveu alternativas limpas", segunda[0]?.nome === "Vitamina de banana (mock)" && segunda[1]?.nome === "Carne moída com arroz (mock)", segunda.map((r: { nome: string }) => r.nome).join(" | "));
check("meal-plan registrou aviso de sanitização", plan.logs().includes("SANITIZADA"));
check("meal-plan trava de suplementação (não treina → null)", plan.json?.suplementacao === null);
console.log("   lista_compras:", JSON.stringify(plan.json?.lista_compras));

const swap = await runFunction("meal-swap", { refeicao: { tipo: "Almoço", nome: "Frango grelhado" } });
check("meal-swap responde 200", swap.status === 200, `status ${swap.status}`);
check("meal-swap devolve receita com nome", typeof swap.json?.nome === "string" && swap.json.nome.length > 0, swap.json?.nome);
check("meal-swap sem alimento proibido", findForbiddenHits(JSON.stringify(swap.json), terms).length === 0);

const unauth = await fetch(FUNCTION_URL).catch(() => null);
check("função encerrada após o teste", unauth === null);

await fake.shutdown();
if (failed) {
  console.log("\nLogs do meal-plan:\n" + plan.logs());
  Deno.exit(1);
}
console.log("\nSmoke test OK.");
