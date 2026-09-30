/**
 * Regras de interface da lista "não gosto": a grade e o texto livre alimentam a MESMA
 * lista (user_preferences.disliked_foods), sem duplicatas por acento/plural/sinônimo.
 */
import { buildForbiddenTerms, canonicalKey, dedupeFoods, findForbiddenHits } from "@/lib/foodPreferences";

/** Mesmo limite aplicado pelas Edge Functions (userContext.MAX_DISLIKED_ITEMS). */
export const MAX_DISLIKED = 80;

/**
 * Junta itens novos à lista. Se o item equivale a um alimento da grade ("peixes" → "Peixe"),
 * usa o rótulo da grade para ele aparecer marcado lá.
 */
export function mergeDisliked(current: string[], additions: string[], gridFoods: string[] = []): string[] {
  const gridByKey = new Map(gridFoods.map((g) => [canonicalKey(g), g]));
  const mapped = additions.map((a) => gridByKey.get(canonicalKey(a)) ?? a.trim()).filter(Boolean);
  return dedupeFoods([...current, ...mapped]).slice(0, MAX_DISLIKED);
}

/** Remove pela chave canônica (remover "cilantro" também tira "Coentro"). */
export function removeDisliked(current: string[], item: string): string[] {
  const key = canonicalKey(item);
  return current.filter((c) => canonicalKey(c) !== key);
}

export const hasDisliked = (current: string[], item: string) => {
  const key = canonicalKey(item);
  return current.some((c) => canonicalKey(c) === key);
};

/** Itens de `after` que não existiam em `before`. */
export function newlyAdded(before: string[], after: string[]): string[] {
  const old = new Set(before.map(canonicalKey));
  return after.filter((a) => !old.has(canonicalKey(a)));
}

type PlanMeal = {
  tipo?: string;
  nome?: string;
  ingredientes?: unknown;
  preparo?: string;
  opcoes?: { nome?: string; ingredientes?: unknown; preparo?: string }[];
};
export type PlanLike = { plano?: { dia?: string; refeicoes?: PlanMeal[] }[] } | null | undefined;

export type MealWithFood = { dia: string; tipo: string; nome: string; foods: string[] };

const mealText = (m: { nome?: string; ingredientes?: unknown; preparo?: string }) =>
  [m.nome, ...(Array.isArray(m.ingredientes) ? m.ingredientes : []), m.preparo]
    .filter((x): x is string => typeof x === "string")
    .join(" \n ");

/** Refeições do plano salvo que contêm algum dos alimentos (inclui opções alternativas). */
export function findMealsWithFoods(plan: PlanLike, disliked: string[], restrictions: string[] = []): MealWithFood[] {
  const terms = buildForbiddenTerms(disliked, restrictions);
  if (!terms.length || !Array.isArray(plan?.plano)) return [];
  const out: MealWithFood[] = [];
  for (const dia of plan.plano) {
    for (const r of Array.isArray(dia?.refeicoes) ? dia.refeicoes : []) {
      const text = [mealText(r), ...(Array.isArray(r.opcoes) ? r.opcoes.map(mealText) : [])].join(" \n ");
      const hits = findForbiddenHits(text, terms);
      if (!hits.length) continue;
      out.push({
        dia: dia.dia ?? "",
        tipo: r.tipo ?? "",
        nome: r.nome ?? "",
        foods: [...new Set(hits.map((h) => h.term.origin))],
      });
    }
  }
  return out;
}
