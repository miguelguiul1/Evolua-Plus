import { describe, expect, it } from "vitest";
import * as viaAlias from "@/lib/foodPreferences";
import * as direct from "../../supabase/functions/_shared/foodPreferences.ts";
import { PARITY_CASES } from "../../supabase/functions/_shared/foodPreferences.cases.ts";
import { ALL_FOODS, RESTRICTIONS } from "@/data/preferencias";

describe("foodPreferences — paridade com o runtime Deno", () => {
  it("o frontend usa exatamente o mesmo módulo das Edge Functions", () => {
    expect(viaAlias.buildForbiddenTerms).toBe(direct.buildForbiddenTerms);
    expect(viaAlias.findForbiddenHits).toBe(direct.findForbiddenHits);
  });

  // Os mesmos casos rodam em supabase/functions/_shared/foodPreferences.test.ts (deno test).
  for (const c of PARITY_CASES) {
    it(c.name, () => {
      expect(c.run(viaAlias)).toEqual(c.expected);
    });
  }
});

describe("foodPreferences — integração com os dados do app", () => {
  it("toda restrição pronta de alergia/intolerância é reconhecida", () => {
    const withFood = RESTRICTIONS.filter((r) => /alergia|intoler/i.test(r));
    for (const r of withFood) expect(viaAlias.extractRestriction(r), r).not.toBeNull();
  });

  it("todo item da grade é reconhecido como alimento", () => {
    for (const food of Object.values(ALL_FOODS).flat()) expect(viaAlias.isLikelyFood(food), food).toBe(true);
  });

  it("marcar Batata na grade não bloqueia Batata-doce (itens separados da grade)", () => {
    const terms = viaAlias.buildForbiddenTerms(["Batata"]);
    expect(viaAlias.findForbiddenHits("Batata-doce assada", terms)).toEqual([]);
    expect(viaAlias.findForbiddenHits("Purê de batata", terms).map((h) => h.match)).toEqual(["batata"]);
  });

  it("alergia tem prioridade sobre não gosto do mesmo alimento", () => {
    const terms = viaAlias.buildForbiddenTerms(["Amendoim"], ["Alergia a amendoim"]);
    expect(terms.find((x) => x.key === "amendoim")?.source).toBe("allergy");
    expect(terms[0].source).toBe("allergy");
  });

  it("extrai o alimento de linhas de ingrediente para os chips", () => {
    expect(viaAlias.extractFoodFromIngredient("200 g de peito de frango")).toBe("Peito de frango");
    expect(viaAlias.extractFoodFromIngredient("1 xícara de chá de aveia")).toBe("Aveia");
    expect(viaAlias.extractFoodFromIngredient("Sal a gosto")).toBe("Sal");
  });

  it("descreve categorias amplas para a interface", () => {
    const cat = viaAlias.describeCategory("Peixe");
    expect(cat?.label).toBe("Peixe");
    expect(cat?.members).toContain("tilápia");
    expect(viaAlias.describeCategory("Tomate")).toBeNull();
  });
});
