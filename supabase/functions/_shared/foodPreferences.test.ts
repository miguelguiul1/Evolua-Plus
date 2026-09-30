import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import * as F from "./foodPreferences.ts";
import { PARITY_CASES } from "./foodPreferences.cases.ts";

// Mesmos casos do vitest (src/lib/foodPreferences.test.ts): garantem resultado idêntico no Deno.
for (const c of PARITY_CASES) {
  Deno.test(`paridade: ${c.name}`, () => {
    assertEquals(c.run(F), c.expected);
  });
}

Deno.test("buildForbiddenTerms: sinônimos, categoria e origem", () => {
  const terms = F.buildForbiddenTerms(["Coentro", "Peixe"], ["Alergia a amendoim", "Diabetes"]);
  const keys = terms.map((t) => t.key);
  for (const k of ["coentro", "cilantro", "peixe", "tilapia", "salmao", "amendoim", "pacoca"]) assert(keys.includes(k), k);
  assertEquals(terms[0].source, "allergy");
  assertEquals(terms.find((t) => t.key === "tilapia")?.origin, "Peixe");
  assert(!keys.includes("diabete"), "diabetes não é alimento");
});

Deno.test("buildForbiddenTerms: entrada vazia ou suja não quebra", () => {
  assertEquals(F.buildForbiddenTerms(), []);
  assertEquals(F.buildForbiddenTerms([], []), []);
  assertEquals(F.buildForbiddenTerms([null, 1, "  "] as unknown as string[], [undefined] as unknown as string[]), []);
});

Deno.test("findForbiddenHits: posições apontam para o texto original", () => {
  const text = "Arroz com COENTRO fresco";
  const [hit] = F.findForbiddenHits(text, F.buildForbiddenTerms(["coentro"]));
  assertEquals(text.slice(hit.start, hit.end), "COENTRO");
});

Deno.test("buildForbiddenPromptLine: linhas separadas e regra absoluta", () => {
  const line = F.buildForbiddenPromptLine(F.buildForbiddenTerms(["Coentro"], ["Alergia a camarão"]));
  const [first, second] = line.split("\n");
  assertStringIncludes(first, "PRIORIDADE MÁXIMA");
  assertStringIncludes(first, "Alergia a camarão");
  assertStringIncludes(
    second,
    "NUNCA inclua os seguintes alimentos, nem como ingrediente, acompanhamento, tempero ou guarnição, incluindo variações e derivados diretos",
  );
  assertStringIncludes(second, "Coentro (cilantro)");
  assertEquals(F.buildForbiddenPromptLine([]), "");
});

Deno.test("scanForViolations: acha em qualquer profundidade com caminho", () => {
  const terms = F.buildForbiddenTerms(["Coentro"]);
  const v = F.scanForViolations(
    { nome: "Frango", ingredientes: ["frango", "coentro"], opcoes: [{ preparo: "Finalize com coentro." }] },
    terms,
  );
  assertEquals(v.map((x) => x.path), ["$.ingredientes[1]", "$.opcoes[0].preparo"]);
  assertEquals(F.scanForViolations(null, terms), []);
  assertEquals(F.scanForViolations({ a: 1 }, []), []);
});

Deno.test("sanitizeTextField: troca por texto neutro, nunca vazio", () => {
  const terms = F.buildForbiddenTerms(["Coentro", "Tilápia"]);
  const out = F.sanitizeTextField("Grelhe a tilápia e finalize com coentro.", terms);
  assertEquals(F.findForbiddenHits(out, terms), []);
  assertStringIncludes(out, F.NEUTRAL_REPLACEMENT);
  assertEquals(F.sanitizeTextField("Tilápia grelhada com arroz", terms, { replacement: "" }), "Grelhada com arroz");
  assertEquals(F.sanitizeTextField("Coentro", terms, { replacement: "", fallback: "Opção adaptada" }), "Opção adaptada");
  assertEquals(F.sanitizeTextField(undefined as unknown as string, terms, { fallback: "X" }), "X");
  assertEquals(F.sanitizeTextField("Arroz e feijão", terms), "Arroz e feijão");
});

Deno.test("sanitizeIngredientList: remove proibidos e nunca devolve vazio", () => {
  const terms = F.buildForbiddenTerms(["Coentro"]);
  assertEquals(F.sanitizeIngredientList(["arroz", "coentro picado"], terms), ["arroz"]);
  assertEquals(F.sanitizeIngredientList(["coentro"], terms), [F.NEUTRAL_INGREDIENT]);
  assertEquals(F.sanitizeIngredientList(undefined, terms), [F.NEUTRAL_INGREDIENT]);
  assertEquals(F.sanitizeIngredientList([], terms, ["a gosto"]), ["a gosto"]);
});

Deno.test("restrições: formatos reconhecidos e NÃO reconhecidos (documentados no relatório)", () => {
  const recognized = [
    "Alergia a camarão", "Alergia ao glúten", "alergia à castanha", "alergia aos ovos", "alergia às nozes",
    "Intolerância à lactose", "intolerância a lactose", "intolerante à lactose", "Alérgico a camarão e amendoim",
    "Alergia: kiwi", "restrição a soja", "celíaco", "doença celíaca", "APLV", "sem glúten", "sem lactose",
    "Vegano", "Vegetariano", "alergia a proteína do leite",
  ];
  for (const r of recognized) assert(F.extractRestriction(r), `deveria reconhecer: ${r}`);
  const notRecognized = ["não posso comer camarão", "camarão (alergia)", "evito glúten", "camarão me faz mal"];
  for (const r of notRecognized) assertEquals(F.extractRestriction(r), null, r);
});
