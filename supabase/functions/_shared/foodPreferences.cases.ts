/**
 * Casos de PARIDADE: rodados pelo vitest (Node, frontend) e pelo `deno test` (Edge Functions).
 * Os dois runtimes precisam produzir exatamente os mesmos resultados — é isso que garante
 * que o que o usuário vê na tela é o mesmo que o servidor bloqueia.
 */
import type * as FoodPreferences from "./foodPreferences.ts";

type Mod = typeof FoodPreferences;

export type ParityCase = {
  name: string;
  run: (f: Mod) => unknown;
  expected: unknown;
};

const hits = (f: Mod, text: string, disliked: string[], restrictions: string[] = []) =>
  f.findForbiddenHits(text, f.buildForbiddenTerms(disliked, restrictions)).map((h) => h.match);

export const PARITY_CASES: ParityCase[] = [
  // Normalização: acento, plural, hífen, artigo
  { name: "acento e caixa", run: (f) => f.normalizeFood("FÍGADO"), expected: "figado" },
  { name: "plural simples", run: (f) => f.normalizeFood("tomates"), expected: "tomate" },
  { name: "plural -ões", run: (f) => f.normalizeFood("limões"), expected: "limao" },
  { name: "plural -ães", run: (f) => f.normalizeFood("pães"), expected: "pao" },
  { name: "plural -zes", run: (f) => f.normalizeFood("nozes"), expected: "noz" },
  { name: "hífen = espaço", run: (f) => f.normalizeFood("Grão-de-bico"), expected: "grao de bico" },
  { name: "artigo inicial", run: (f) => f.normalizeFood("os camarões"), expected: "camarao" },
  { name: "sinônimo cilantro→coentro", run: (f) => f.canonicalKey("Cilantro"), expected: "coentro" },
  { name: "sinônimo aipim→mandioca", run: (f) => f.canonicalKey("aipim"), expected: "mandioca" },

  // Texto livre
  {
    name: "frase natural",
    run: (f) => f.parseFreeText("não gosto de fígado, jiló e coentro"),
    expected: { foods: ["Fígado", "Jiló", "Coentro"], rejected: [] },
  },
  {
    name: "separadores e rejeição",
    run: (f) => f.parseFreeText("asdfgh; 123; nada\nqueijo minas / grão-de-bico ou carne moída"),
    expected: { foods: ["Queijo minas", "Grão-de-bico", "Carne moída"], rejected: ["asdfgh", "123", "nada"] },
  },
  { name: "dedupe por sinônimo e plural", run: (f) => f.dedupeFoods(["Coentro", "cilantro", "Tomates", "tomate"]), expected: ["Coentro", "Tomates"] },

  // Detecção
  { name: "acento no texto", run: (f) => hits(f, "Bife de FIGADO acebolado", ["Fígado"]), expected: ["FIGADO"] },
  { name: "plural no texto", run: (f) => hits(f, "Salada de tomates", ["Tomate"]), expected: ["tomates"] },
  { name: "sinônimo no texto", run: (f) => hits(f, "Guacamole com cilantro", ["Coentro"]), expected: ["cilantro"] },
  {
    name: "categoria peixe",
    run: (f) => hits(f, "Tilápia grelhada; salmão; atum em lata; frango", ["Peixe"]),
    expected: ["Tilápia", "salmão", "atum"],
  },
  {
    name: "alergia a amendoim (com derivados)",
    run: (f) => hits(f, "Paçoca e pasta de amendoim", [], ["Alergia a amendoim"]),
    expected: ["Paçoca", "pasta de amendoim", "amendoim"],
  },
  { name: "falso positivo ervilha × berinjela", run: (f) => hits(f, "Berinjela assada", ["Ervilha"]), expected: [] },
  { name: "falso positivo cebola × cebolinha", run: (f) => hits(f, "Ovo com cebolinha", ["Cebola"]), expected: [] },
  { name: "leite não expande para queijo", run: (f) => hits(f, "Pão com queijo e iogurte", ["Leite"]), expected: [] },
  { name: "leite não bloqueia leite de amêndoas", run: (f) => hits(f, "Vitamina com leite de amêndoas", ["Leite"]), expected: [] },
  { name: "leite bloqueia leite", run: (f) => hits(f, "Café com leite", ["Leite"]), expected: ["leite"] },
  { name: "duas palavras: queijo minas", run: (f) => hits(f, "Queijo minas frescal; queijo prato", ["Queijo minas"]), expected: ["Queijo minas"] },
  { name: "duas palavras: carne moída", run: (f) => hits(f, "Carne moída com arroz; carne assada", ["Carne moída"]), expected: ["Carne moída"] },
  { name: "hífen: grão-de-bico", run: (f) => hits(f, "Homus de grão de bico; grãos-de-bico", ["Grão-de-bico"]), expected: ["grão de bico", "grãos-de-bico"] },
  { name: "negação 'sem'", run: (f) => hits(f, "Sirva sem cebola.", ["Cebola"]), expected: [] },
  { name: "intolerância à lactose: sem lactose é permitido", run: (f) => hits(f, "Iogurte sem lactose e queijo", [], ["Intolerância à lactose"]), expected: ["queijo"] },

  // Restrições
  { name: "alergia a X", run: (f) => f.extractRestriction("Alergia a camarão")?.foods, expected: ["Camarão"] },
  { name: "alergia à X", run: (f) => f.extractRestriction("alergia à castanha")?.foods, expected: ["Castanha"] },
  { name: "alergia aos X", run: (f) => f.extractRestriction("alergia aos ovos")?.foods, expected: ["Ovos"] },
  { name: "intolerância a lactose", run: (f) => f.extractRestriction("Intolerância a lactose")?.safe, expected: "lactose" },
  { name: "diabetes não vira alimento", run: (f) => f.extractRestriction("Diabetes"), expected: null },

  // Sanitização
  {
    name: "sanitiza nome removendo",
    run: (f) => f.sanitizeTextField("Salada com coentro", f.buildForbiddenTerms(["Coentro"]), { replacement: "" }),
    expected: "Salada",
  },
  {
    name: "ingredientes nunca vazios",
    run: (f) => f.sanitizeIngredientList(["coentro"], f.buildForbiddenTerms(["Coentro"])),
    expected: ["Ingrediente de sua preferência (substituto)"],
  },
];
