/**
 * Regras por função (meal-plan, meal-swap, analyze-fridge, nutrition-chat) sobre o laço
 * genérico de aiGuard.ts. Tudo aqui é puro e recebe `callAI` como parâmetro — é o que os
 * testes com IA simulada exercitam.
 */
import { generateWithGuard, type GuardResult } from "./aiGuard.ts";
import {
  type ForbiddenTerm,
  type Violation,
  containsForbidden,
  findForbiddenHits,
  sanitizeIngredientList,
  sanitizeTextField,
  scanForViolations,
} from "./foodPreferences.ts";

type Obj = Record<string, unknown>;
type Logger = Pick<Console, "warn" | "error">;
type CallAI = (feedback: string | null) => Promise<string>;

type RunOptions = {
  callAI: CallAI;
  terms: ForbiddenTerm[];
  maxRegenerations?: number;
  timeBudgetMs?: number;
  now?: () => number;
  logger?: Logger;
};

export const FALLBACK_RECIPE_NAME = "Opção adaptada às suas preferências";
export const FALLBACK_PREPARO = "Prepare com os ingredientes listados, ajustando a seu gosto.";
const FALLBACK_MOTIVO = "Substituição sugerida de acordo com as suas preferências.";

// Remove intencionalmente caracteres de controle da resposta da IA antes do parse.
// deno-lint-ignore no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g; // eslint-disable-line no-control-regex

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** Tira cercas de markdown e recorta do primeiro { (ou [) até o último } (ou ]). */
const extractJson = (content: string): string | null => {
  const cleaned = (content ?? "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) return null;
  const end = cleaned[start] === "[" ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (end === -1 || end < start) return null;
  return cleaned.substring(start, end + 1);
};

// ---------------------------------------------------------------------------
// Receita (bloco comum)
// ---------------------------------------------------------------------------

/** Campos de receita que disparam regeneração. */
const RECIPE_FIELDS = ["nome", "ingredientes", "preparo"] as const;

export const scanRecipe = (recipe: unknown, terms: ForbiddenTerm[], path = "$"): Violation[] => {
  if (!isObj(recipe)) return [];
  return RECIPE_FIELDS.flatMap((f) => scanForViolations(recipe[f], terms, `${path}.${f}`));
};

/** Remove ingrediente proibido, troca menções por texto neutro, nunca deixa nome/lista vazios. */
export function sanitizeRecipe<R extends Obj>(recipe: R, terms: ForbiddenTerm[], fallbackName = FALLBACK_RECIPE_NAME): R {
  const nome = typeof recipe.nome === "string" && recipe.nome.trim()
    ? sanitizeTextField(recipe.nome, terms, { replacement: "", fallback: fallbackName })
    : fallbackName;
  const preparo = typeof recipe.preparo === "string" && recipe.preparo.trim()
    ? sanitizeTextField(recipe.preparo, terms, { fallback: FALLBACK_PREPARO })
    : FALLBACK_PREPARO;
  return {
    ...recipe,
    nome: nome.length >= 3 ? nome : fallbackName,
    ingredientes: sanitizeIngredientList(recipe.ingredientes, terms),
    preparo,
  };
}

const cleanStringList = (list: unknown, terms: ForbiddenTerm[]) =>
  Array.isArray(list) ? list.filter((i) => typeof i !== "string" || !containsForbidden(i, terms)) : list;

const cleanText = (text: unknown, terms: ForbiddenTerm[], fallback: string) =>
  typeof text === "string" && containsForbidden(text, terms) ? sanitizeTextField(text, terms, { fallback }) : text;

// ---------------------------------------------------------------------------
// meal-plan
// ---------------------------------------------------------------------------

type MealPlan = Obj & { plano?: unknown };

/**
 * Interpretação da resposta do meal-plan — mesma lógica que antes vivia no index.ts
 * (cercas, recorte, vírgulas sobrando, array solto, 1-3 opções, trava de suplementação).
 * Devolve null em vez de lançar.
 */
export function parseMealPlanContent(content: string, trains: boolean): MealPlan | null {
  try {
    const sliced = extractJson(content);
    if (!sliced) return null;
    const cleaned = sliced
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(CONTROL_CHARS, " ");
    let parsed: unknown = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      parsed = {
        plano: parsed,
        resumo: { calorias_media: 0, proteina_media: 0, carb_media: 0, gordura_media: 0 },
        lista_compras: [],
        custo_estimado: "Não calculado",
        dicas: [],
      };
    }
    if (!isObj(parsed)) return null;
    const plan = parsed as MealPlan;

    // Garante 1-3 opções por refeição mesmo se a IA não seguir a instrução à risca.
    if (Array.isArray(plan.plano)) {
      for (const dia of plan.plano) {
        if (!isObj(dia) || !Array.isArray(dia.refeicoes)) continue;
        for (const r of dia.refeicoes) {
          if (!isObj(r)) continue;
          if (!Array.isArray(r.opcoes) || r.opcoes.length === 0) {
            r.opcoes = [{
              nome: r.nome, calorias: r.calorias, proteina: r.proteina, carb: r.carb,
              gordura: r.gordura, ingredientes: r.ingredientes, preparo: r.preparo,
            }];
          }
        }
      }
    }

    // Suplementação nunca aparece pra quem não treina, mesmo que a IA ignore o prompt.
    if (!trains) {
      plan.suplementacao = null;
    } else if (isObj(plan.suplementacao)) {
      const s = plan.suplementacao;
      const clampField = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 400) : null);
      const sup = { pre_treino: clampField(s.pre_treino), intra_treino: clampField(s.intra_treino), pos_treino: clampField(s.pos_treino) };
      plan.suplementacao = sup.pre_treino || sup.intra_treino || sup.pos_treino ? sup : null;
    } else {
      plan.suplementacao = null;
    }
    return plan;
  } catch {
    return null;
  }
}

const meals = (plan: MealPlan): { r: Obj; path: string }[] => {
  const out: { r: Obj; path: string }[] = [];
  if (!Array.isArray(plan.plano)) return out;
  plan.plano.forEach((dia, d) => {
    if (!isObj(dia) || !Array.isArray(dia.refeicoes)) return;
    dia.refeicoes.forEach((r, i) => {
      if (isObj(r)) out.push({ r, path: `$.plano[${d}].refeicoes[${i}]` });
    });
  });
  return out;
};

/** Varre nome, ingredientes, preparo e opções alternativas de cada refeição. */
export function scanMealPlan(plan: MealPlan, terms: ForbiddenTerm[]): Violation[] {
  return meals(plan).flatMap(({ r, path }) => [
    ...scanRecipe(r, terms, path),
    ...(Array.isArray(r.opcoes) ? r.opcoes.flatMap((o, j) => scanRecipe(o, terms, `${path}.opcoes[${j}]`)) : []),
  ]);
}

const MACRO_FIELDS = ["nome", "calorias", "proteina", "carb", "gordura", "ingredientes", "preparo"];

/**
 * Prefere promover uma opção alternativa LIMPA (substituição real, com macros coerentes);
 * só sanitiza o texto quando nenhuma opção da refeição está limpa.
 */
export function sanitizeMealPlan(plan: MealPlan, terms: ForbiddenTerm[]): MealPlan {
  const copy = structuredClone(plan) as MealPlan;
  for (const { r } of meals(copy)) {
    const opcoes = Array.isArray(r.opcoes) ? r.opcoes.filter(isObj) : [];
    const mainDirty = scanRecipe(r, terms).length > 0;
    const clean = opcoes.filter((o) => scanRecipe(o, terms).length === 0);
    if (!mainDirty && clean.length === opcoes.length) continue;

    if (clean.length) {
      if (mainDirty) for (const f of MACRO_FIELDS) r[f] = clean[0][f];
      r.opcoes = clean;
    } else {
      const fixed = sanitizeRecipe(r, terms);
      Object.assign(r, fixed);
      r.opcoes = [Object.fromEntries(MACRO_FIELDS.map((f) => [f, fixed[f]]))];
    }
  }
  return finalizeMealPlan(copy, terms);
}

/** Sempre aplicado: lista de compras, dicas e suplementação não disparam regeneração, mas também não levam item proibido. */
export function finalizeMealPlan(plan: MealPlan, terms: ForbiddenTerm[]): MealPlan {
  if (!terms.length) return plan;
  plan.lista_compras = cleanStringList(plan.lista_compras, terms);
  if (Array.isArray(plan.dicas)) {
    plan.dicas = plan.dicas.filter((d) => typeof d !== "string" || !containsForbidden(d, terms));
  }
  if (isObj(plan.suplementacao)) {
    for (const k of ["pre_treino", "intra_treino", "pos_treino"]) {
      plan.suplementacao[k] = cleanText(plan.suplementacao[k], terms, "Escolha um alimento de sua preferência.");
    }
  }
  return plan;
}

export async function runMealPlanGuard(
  opts: RunOptions & { trains: boolean },
): Promise<GuardResult<MealPlan>> {
  const result = await generateWithGuard<MealPlan>({
    label: "meal-plan",
    ...opts,
    parse: (raw) => parseMealPlanContent(raw, opts.trains),
    scan: scanMealPlan,
    sanitize: sanitizeMealPlan,
  });
  if (result.value && !result.sanitized) result.value = finalizeMealPlan(result.value, opts.terms);
  return result;
}

// ---------------------------------------------------------------------------
// meal-swap
// ---------------------------------------------------------------------------

/** Mesmo parse que antes vivia no index.ts; null quando não é um objeto JSON. */
export function parseSwapContent(content: string): Obj | null {
  try {
    const raw = (content ?? "").replace(/```json|```/gi, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed: unknown = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw);
    return isObj(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const sanitizeSwap = (swap: Obj, terms: ForbiddenTerm[]): Obj => ({
  ...sanitizeRecipe(swap, terms),
  motivo_troca: cleanText(swap.motivo_troca, terms, FALLBACK_MOTIVO),
});

export function runMealSwapGuard(opts: RunOptions): Promise<GuardResult<Obj>> {
  return generateWithGuard<Obj>({
    label: "meal-swap",
    ...opts,
    parse: parseSwapContent,
    scan: (v, t) => scanRecipe(v, t),
    sanitize: sanitizeSwap,
  }).then((result) => {
    // O motivo da troca não dispara regeneração ("trocamos o coentro por..." é legítimo),
    // mas também não pode sugerir o alimento.
    if (result.value && !result.sanitized && typeof result.value.motivo_troca === "string") {
      result.value.motivo_troca = containsForbidden(result.value.motivo_troca, opts.terms)
        ? FALLBACK_MOTIVO
        : result.value.motivo_troca;
    }
    return result;
  });
}

// ---------------------------------------------------------------------------
// analyze-fridge (somente as receitas sugeridas)
// ---------------------------------------------------------------------------

/** Mesmo parse + checagem de formato que antes vivia no index.ts. */
export function parseFridgeContent(content: string): Obj | null {
  try {
    const clean = (content ?? "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed: unknown = JSON.parse(clean);
    if (!isObj(parsed) || !Array.isArray(parsed.alimentos) || !Array.isArray(parsed.receitas) || !Array.isArray(parsed.dicas)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Só as receitas: os alimentos identificados na foto são o que a pessoa tem, não sugestão. */
export const scanFridge = (v: Obj, terms: ForbiddenTerm[]): Violation[] =>
  (v.receitas as unknown[]).flatMap((r, i) => scanRecipe(r, terms, `$.receitas[${i}]`));

export function sanitizeFridge(v: Obj, terms: ForbiddenTerm[]): Obj {
  const receitas = (v.receitas as unknown[]).filter(isObj);
  const clean = receitas.filter((r) => scanRecipe(r, terms).length === 0);
  return { ...v, receitas: clean.length ? clean : receitas.map((r) => sanitizeRecipe(r, terms)) };
}

export function runFridgeGuard(opts: RunOptions): Promise<GuardResult<Obj>> {
  return generateWithGuard<Obj>({
    label: "analyze-fridge",
    ...opts,
    parse: parseFridgeContent,
    scan: scanFridge,
    // Rede final do aiGuard olha o objeto todo; aqui só as receitas importam.
    sanitize: sanitizeFridge,
  });
}

// ---------------------------------------------------------------------------
// nutrition-chat (texto livre)
// ---------------------------------------------------------------------------

/** Trechos em que citar o alimento é legítimo ("evite coentro", "como você não gosta de..."). */
const MENTION_CONTEXT = /(?:sem|evite|evitar|exceto|substitu\w*|troc\w*|n[aã]o gosta\w*|alergi\w*|al[eé]rgic\w*|intoler\w*|no lugar d\w*)\s+(?:\S+\s+){0,3}$/iu;

/** Menções proibidas numa resposta do chat, ignorando citações legítimas. */
export function findChatViolations(reply: string, terms: ForbiddenTerm[]) {
  return findForbiddenHits(reply, terms).filter((h) => !MENTION_CONTEXT.test(reply.slice(Math.max(0, h.start - 60), h.start)));
}

/**
 * Chat: uma única regeneração e aviso no log. Não sanitiza — a resposta é texto livre e
 * pode citar o alimento com razão. Termos que o próprio usuário citou na última mensagem
 * ficam de fora (ele perguntou sobre eles).
 */
export async function runChatGuard(opts: {
  callAI: CallAI;
  terms: ForbiddenTerm[];
  lastUserMessage: string;
  logger?: Logger;
}): Promise<{ reply: string; regenerated: boolean; violations: string[]; attempts: number }> {
  const { callAI, lastUserMessage, logger = console } = opts;
  const askedOrigins = new Set(findForbiddenHits(lastUserMessage ?? "", opts.terms).map((h) => h.term.origin));
  const terms = opts.terms.filter((t) => !askedOrigins.has(t.origin));

  const first = await callAI(null);
  const hits = findChatViolations(first, terms);
  if (!hits.length) return { reply: first, regenerated: false, violations: [], attempts: 1 };

  const labels = [...new Set(hits.map((h) => h.match.toLowerCase()))];
  logger.warn("[nutrition-chat] resposta citou alimentos proibidos; regenerando uma vez.", labels);
  let second: string;
  try {
    second = await callAI(
      `ATENÇÃO: não sugira ${labels.join(", ")} — o usuário não come esses alimentos (restrição, alergia ou não gosta). Reescreva a resposta sem sugeri-los.`,
    );
  } catch (e) {
    logger.warn("[nutrition-chat] falha na regeneração; mantendo a primeira resposta.", e);
    return { reply: first, regenerated: false, violations: labels, attempts: 2 };
  }
  const still = findChatViolations(second, terms).map((h) => h.match.toLowerCase());
  if (still.length) logger.warn("[nutrition-chat] resposta regenerada ainda cita alimentos proibidos.", [...new Set(still)]);
  return { reply: second, regenerated: true, violations: [...new Set(still)], attempts: 2 };
}
