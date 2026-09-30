/**
 * Fluxo completo com IA SIMULADA: gerar → validar → regenerar → sanitizar.
 * Nenhum teste chama a IA real; `callAI` devolve respostas roteirizadas.
 */
import { assert, assertEquals, assertRejects, assertStringIncludes } from "jsr:@std/assert@1";
import { AIHttpError } from "./aiGuard.ts";
import { buildForbiddenTerms, findForbiddenHits, type ForbiddenTerm } from "./foodPreferences.ts";
import {
  FALLBACK_RECIPE_NAME,
  parseMealPlanContent,
  runChatGuard,
  runFridgeGuard,
  runMealPlanGuard,
  runMealSwapGuard,
} from "./recipeGuards.ts";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** IA roteirizada: devolve as respostas em ordem e registra o feedback recebido. */
function scriptedAI(responses: (string | Error)[]) {
  const feedbacks: (string | null)[] = [];
  const callAI = (feedback: string | null) => {
    feedbacks.push(feedback);
    const next = responses[Math.min(feedbacks.length - 1, responses.length - 1)];
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  };
  return { callAI, feedbacks, get calls() { return feedbacks.length; } };
}

function silentLogger() {
  const warns: string[] = [];
  const errors: string[] = [];
  return {
    warns,
    errors,
    logger: {
      warn: (...a: unknown[]) => void warns.push(a.map(String).join(" ")),
      error: (...a: unknown[]) => void errors.push(a.map(String).join(" ")),
    },
  };
}

const allText = (v: unknown) => JSON.stringify(v);
const assertNoForbidden = (v: unknown, terms: ForbiddenTerm[]) =>
  assertEquals(findForbiddenHits(allText(v), terms).map((h) => h.match), [], "resultado contém termo proibido");

type Opt = { nome: string; ingredientes: string[]; preparo: string };
const opt = (nome: string, ingredientes: string[], preparo = `Prepare ${nome.toLowerCase()}.`, calorias = 400): Opt & Record<string, unknown> =>
  ({ nome, calorias, proteina: 30, carb: 40, gordura: 10, ingredientes, preparo });

/** Plano de 1 dia: almoço com principal + alternativa, jantar simples. */
function planJSON(almoco: Opt, alternativa: Opt, extras: Record<string, unknown> = {}) {
  const main = opt(almoco.nome, almoco.ingredientes, almoco.preparo);
  return JSON.stringify({
    plano: [{
      dia: "Segunda",
      refeicoes: [
        { tipo: "Almoço", ...main, opcoes: [main, opt(alternativa.nome, alternativa.ingredientes, alternativa.preparo, 410)] },
        { tipo: "Jantar", ...opt("Sopa de legumes", ["cenoura", "batata", "chuchu"]) },
      ],
    }],
    resumo: { calorias_media: 1800, proteina_media: 120, carb_media: 180, gordura_media: 50 },
    lista_compras: ["Frango", "Cenoura", "Arroz"],
    custo_estimado: "R$ 100",
    dicas: ["Beba água."],
    suplementacao: { pre_treino: "Banana" },
    ...extras,
  });
}

const CLEAN_PLAN = planJSON(
  { nome: "Frango grelhado com arroz", ingredientes: ["frango", "arroz"], preparo: "Grelhe o frango." },
  { nome: "Omelete de espinafre", ingredientes: ["ovo", "espinafre"], preparo: "Bata os ovos." },
);
const DIRTY_PLAN = planJSON(
  { nome: "Tilápia com coentro", ingredientes: ["tilápia", "coentro", "arroz"], preparo: "Grelhe a tilápia e finalize com coentro." },
  { nome: "Salmão ao forno", ingredientes: ["salmão", "limão"], preparo: "Asse o salmão." },
  { lista_compras: ["Tilápia", "Coentro", "Arroz"], dicas: ["Use coentro fresco.", "Beba água."] },
);
/** Principal sujo, mas a alternativa está limpa: deve ser promovida. */
const DIRTY_MAIN_CLEAN_ALT = planJSON(
  { nome: "Tilápia grelhada", ingredientes: ["tilápia", "arroz"], preparo: "Grelhe a tilápia." },
  { nome: "Frango ao molho", ingredientes: ["frango", "tomate"], preparo: "Cozinhe o frango no molho." },
);

const TERMS = buildForbiddenTerms(["Coentro", "Peixe"], ["Alergia a amendoim"]);

// ---------------------------------------------------------------------------
// meal-plan
// ---------------------------------------------------------------------------

Deno.test("meal-plan (a): plano limpo → sem regeneração", async () => {
  const ai = scriptedAI([CLEAN_PLAN]);
  const log = silentLogger();
  const r = await runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false, logger: log.logger });
  assertEquals(ai.calls, 1);
  assertEquals(r.regenerations, 0);
  assertEquals(r.sanitized, false);
  assertEquals(ai.feedbacks, [null]);
  assertEquals((r.value?.plano as unknown[]).length, 1);
  assertEquals(r.value?.suplementacao, null, "trava de suplementação preservada");
  assertEquals(log.warns, []);
});

Deno.test("meal-plan (b): proibido na 1ª, limpo na 2ª → regenera uma vez e entrega o limpo", async () => {
  const ai = scriptedAI([DIRTY_PLAN, CLEAN_PLAN]);
  const log = silentLogger();
  const r = await runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false, logger: log.logger });
  assertEquals(ai.calls, 2);
  assertEquals(r.regenerations, 1);
  assertEquals(r.sanitized, false);
  const almoco = (r.value!.plano as { refeicoes: Record<string, unknown>[] }[])[0].refeicoes[0];
  assertEquals(almoco.nome, "Frango grelhado com arroz", "entrega a 2ª resposta, sem mexer");
  // O feedback diz à IA o que violou.
  assertStringIncludes(ai.feedbacks[1]!, "REJEITADA");
  assertStringIncludes(ai.feedbacks[1]!, "coentro");
  assertStringIncludes(ai.feedbacks[1]!, "Peixe");
  assertNoForbidden(r.value, TERMS);
});

Deno.test("meal-plan (c): proibido em todas → 3 chamadas, sanitiza, avisa e não entrega o termo", async () => {
  const ai = scriptedAI([DIRTY_PLAN]);
  const log = silentLogger();
  const r = await runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false, logger: log.logger });
  assertEquals(ai.calls, 3);
  assertEquals(r.regenerations, 2);
  assertEquals(r.sanitized, true);
  assert(r.violations.length > 0);
  assertNoForbidden(r.value, TERMS);
  assert(log.warns.some((w) => w.includes("SANITIZADA")), "registra aviso");

  const almoco = (r.value!.plano as { refeicoes: Record<string, unknown>[] }[])[0].refeicoes[0];
  assert(typeof almoco.nome === "string" && almoco.nome.length >= 3, "receita nunca sem nome");
  assert((almoco.ingredientes as string[]).length > 0, "ingredientes nunca vazios");
  assert((almoco.opcoes as unknown[]).length > 0, "sempre ao menos uma opção");
  assertEquals(r.value!.lista_compras, ["Arroz"]);
  assertEquals(r.value!.dicas, ["Beba água."]);
  // Jantar limpo não é tocado.
  assertEquals((r.value!.plano as { refeicoes: Record<string, unknown>[] }[])[0].refeicoes[1].nome, "Sopa de legumes");
});

Deno.test("meal-plan (c'): sanitização promove a alternativa limpa quando existe", async () => {
  const ai = scriptedAI([DIRTY_MAIN_CLEAN_ALT]);
  const r = await runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false, logger: silentLogger().logger });
  const almoco = (r.value!.plano as { refeicoes: Record<string, unknown>[] }[])[0].refeicoes[0];
  assertEquals(almoco.nome, "Frango ao molho");
  assertEquals(almoco.calorias, 410, "macros acompanham a opção promovida");
  assertEquals((almoco.opcoes as Opt[]).map((o) => o.nome), ["Frango ao molho"]);
  assertNoForbidden(r.value, TERMS);
});

Deno.test("meal-plan (d): JSON inválido ou vazio na 1ª → value null (erro controlado), sem lançar", async () => {
  for (const bad of ["", "desculpe, não consegui", "{ plano: [ quebrado", "```json\n```", "null", "42"]) {
    const ai = scriptedAI([bad]);
    const r = await runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false, logger: silentLogger().logger });
    assertEquals(r.value, null, `entrada: ${JSON.stringify(bad)}`);
    assertEquals(ai.calls, 1, "comportamento anterior: JSON inválido não é regenerado");
  }
});

Deno.test("meal-plan (d'): proibido na 1ª e JSON inválido na 2ª → sanitiza a 1ª", async () => {
  const ai = scriptedAI([DIRTY_PLAN, "não é json"]);
  const log = silentLogger();
  const r = await runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false, logger: log.logger });
  assertEquals(ai.calls, 2);
  assertEquals(r.sanitized, true);
  assertNoForbidden(r.value, TERMS);
  assert(log.warns.some((w) => w.includes("inválida")));
});

Deno.test("meal-plan: parse preserva regras antigas (cercas, vírgula sobrando, array solto, opções)", () => {
  const fenced = "```json\n" + CLEAN_PLAN.replace('"arroz"]', '"arroz",]') + "\n```";
  assert(parseMealPlanContent(fenced, false));
  const arr = parseMealPlanContent(JSON.stringify([{ dia: "Segunda", refeicoes: [{ tipo: "Almoço", nome: "X", ingredientes: ["a"] }] }]), false);
  assertEquals(arr?.custo_estimado, "Não calculado");
  const r0 = (arr!.plano as { refeicoes: Record<string, unknown>[] }[])[0].refeicoes[0];
  assertEquals((r0.opcoes as Opt[])[0].nome, "X");
  const trained = parseMealPlanContent(CLEAN_PLAN, true);
  assertEquals(trained?.suplementacao, { pre_treino: "Banana", intra_treino: null, pos_treino: null });
});

Deno.test("meal-plan: erro HTTP da IA na 1ª chamada é repassado (função responde 429/402 como antes)", async () => {
  const ai = scriptedAI([new AIHttpError(429, "rate")]);
  await assertRejects(() => runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false }), AIHttpError);
});

Deno.test("meal-plan: erro HTTP na regeneração → sanitiza a resposta anterior", async () => {
  const ai = scriptedAI([DIRTY_PLAN, new AIHttpError(500, "boom")]);
  const r = await runMealPlanGuard({ callAI: ai.callAI, terms: TERMS, trains: false, logger: silentLogger().logger });
  assertEquals(r.sanitized, true);
  assertNoForbidden(r.value, TERMS);
});

Deno.test("meal-plan: sem tempo para regenerar → sanitiza direto", async () => {
  let t = 0;
  const ai = scriptedAI([DIRTY_PLAN, CLEAN_PLAN]);
  const r = await runMealPlanGuard({
    callAI: (f) => { t += 100_000; return ai.callAI(f); },
    now: () => t, timeBudgetMs: 75_000, terms: TERMS, trains: false, logger: silentLogger().logger,
  });
  assertEquals(ai.calls, 1);
  assertEquals(r.sanitized, true);
  assertNoForbidden(r.value, TERMS);
});

Deno.test("meal-plan: sem termos proibidos → nunca regenera", async () => {
  const ai = scriptedAI([DIRTY_PLAN]);
  const r = await runMealPlanGuard({ callAI: ai.callAI, terms: [], trains: false });
  assertEquals(ai.calls, 1);
  assertEquals(r.sanitized, false);
});

// ---------------------------------------------------------------------------
// meal-swap
// ---------------------------------------------------------------------------

const swap = (nome: string, ingredientes: string[], preparo: string, motivo = "Troca equilibrada.") =>
  JSON.stringify({ tipo: "Almoço", nome, calorias: 450, proteina: 30, carb: 40, gordura: 12, ingredientes, preparo, motivo_troca: motivo });

const CLEAN_SWAP = swap("Frango com legumes", ["frango", "abobrinha"], "Refogue tudo.", "Trocamos o peixe por frango.");
const DIRTY_SWAP = swap("Salmão com coentro", ["salmão", "coentro"], "Asse o salmão com coentro.");

Deno.test("meal-swap (a): troca limpa → sem regeneração; motivo que cita o alimento vira texto neutro", async () => {
  const ai = scriptedAI([CLEAN_SWAP]);
  const r = await runMealSwapGuard({ callAI: ai.callAI, terms: TERMS });
  assertEquals(ai.calls, 1);
  assertEquals(r.sanitized, false);
  assertEquals(r.value?.nome, "Frango com legumes");
  // "Trocamos o peixe por frango" citaria o alimento proibido: vira texto neutro, sem regenerar.
  assertNoForbidden(r.value, TERMS);
});

Deno.test("meal-swap (b): proibido na 1ª, limpo na 2ª → regenera uma vez", async () => {
  const ai = scriptedAI([DIRTY_SWAP, CLEAN_SWAP]);
  const r = await runMealSwapGuard({ callAI: ai.callAI, terms: TERMS, logger: silentLogger().logger });
  assertEquals(ai.calls, 2);
  assertEquals(r.regenerations, 1);
  assertEquals(r.value?.nome, "Frango com legumes");
  assertStringIncludes(ai.feedbacks[1]!, "Salmão");
});

Deno.test("meal-swap (c): proibido sempre → sanitiza, nome e ingredientes nunca vazios", async () => {
  const ai = scriptedAI([swap("Salmão", ["salmão", "coentro"], "Asse o salmão.")]);
  const log = silentLogger();
  const r = await runMealSwapGuard({ callAI: ai.callAI, terms: TERMS, logger: log.logger });
  assertEquals(ai.calls, 3);
  assertEquals(r.sanitized, true);
  assertEquals(r.value?.nome, FALLBACK_RECIPE_NAME);
  assert((r.value?.ingredientes as string[]).length > 0);
  assertNoForbidden(r.value, TERMS);
  assert(log.warns.some((w) => w.includes("SANITIZADA")));
});

Deno.test("meal-swap (d): JSON inválido/vazio → value null, sem lançar", async () => {
  for (const bad of ["", "{", "[1,2]", "texto solto"]) {
    const r = await runMealSwapGuard({ callAI: scriptedAI([bad]).callAI, terms: TERMS });
    assertEquals(r.value, null, JSON.stringify(bad));
  }
});

// ---------------------------------------------------------------------------
// analyze-fridge (só receitas)
// ---------------------------------------------------------------------------

const fridge = (receitas: Opt[]) =>
  JSON.stringify({ alimentos: [{ nome: "Coentro", quantidade: "1 maço", calorias: 5 }], receitas, dicas: ["ok"] });

Deno.test("analyze-fridge: remove só receitas proibidas; alimentos da foto ficam intactos", async () => {
  const ai = scriptedAI([fridge([opt("Arroz com coentro", ["arroz", "coentro"]), opt("Omelete", ["ovo"])])]);
  const r = await runFridgeGuard({ callAI: ai.callAI, terms: TERMS, logger: silentLogger().logger });
  assertEquals(ai.calls, 3);
  assertEquals((r.value?.receitas as Opt[]).map((x) => x.nome), ["Omelete"]);
  assertEquals((r.value?.alimentos as { nome: string }[])[0].nome, "Coentro", "o que está na geladeira não é censurado");
});

Deno.test("analyze-fridge: formato inválido → null", async () => {
  const r = await runFridgeGuard({ callAI: scriptedAI(['{"alimentos": []}']).callAI, terms: TERMS });
  assertEquals(r.value, null);
});

// ---------------------------------------------------------------------------
// nutrition-chat (texto livre)
// ---------------------------------------------------------------------------

Deno.test("nutrition-chat: resposta limpa → 1 chamada", async () => {
  const ai = scriptedAI(["Coma mais ovos e frango."]);
  const r = await runChatGuard({ callAI: ai.callAI, terms: TERMS, lastUserMessage: "ideias de proteína?" });
  assertEquals(ai.calls, 1);
  assertEquals(r.regenerated, false);
});

Deno.test("nutrition-chat: sugere proibido → regenera UMA vez e registra aviso", async () => {
  const ai = scriptedAI(["Experimente salmão grelhado.", "Experimente salmão de novo."]);
  const log = silentLogger();
  const r = await runChatGuard({ callAI: ai.callAI, terms: TERMS, lastUserMessage: "ideias de jantar?", logger: log.logger });
  assertEquals(ai.calls, 2);
  assertEquals(r.regenerated, true);
  assertEquals(r.violations, ["salmão"]);
  assertEquals(log.warns.length, 2);
});

Deno.test("nutrition-chat: não conta citação legítima nem alimento que o usuário perguntou", async () => {
  const ai = scriptedAI(["Como você não gosta de coentro, use salsinha. Tilápia é um peixe magro."]);
  const r = await runChatGuard({ callAI: ai.callAI, terms: TERMS, lastUserMessage: "Tilápia engorda?" });
  assertEquals(ai.calls, 1);
  assertEquals(r.regenerated, false);
});
