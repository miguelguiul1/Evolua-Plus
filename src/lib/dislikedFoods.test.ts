import { describe, expect, it } from "vitest";
import { findMealsWithFoods, hasDisliked, mergeDisliked, newlyAdded, removeDisliked } from "@/lib/dislikedFoods";

const GRID = ["Peixe", "Leite", "Grão-de-bico"];

describe("lista de não gosto (grade + texto livre)", () => {
  it("grade e texto livre alimentam a mesma lista, sem duplicatas", () => {
    expect(mergeDisliked(["Peixe"], ["peixes", "coentro", "Cilantro"], GRID)).toEqual(["Peixe", "coentro"]);
  });

  it("texto livre equivalente a item da grade usa o rótulo da grade", () => {
    expect(mergeDisliked([], ["grao de bico"], GRID)).toEqual(["Grão-de-bico"]);
  });

  it("remove pela chave canônica", () => {
    expect(removeDisliked(["Coentro", "Jiló"], "cilantro")).toEqual(["Jiló"]);
    expect(hasDisliked(["Tomates"], "tomate")).toBe(true);
  });

  it("detecta só os itens realmente novos", () => {
    expect(newlyAdded(["Coentro"], ["Coentro", "cilantro", "Jiló"])).toEqual(["Jiló"]);
  });
});

describe("aviso de plano salvo com alimento novo", () => {
  const plan = {
    plano: [
      {
        dia: "Segunda",
        refeicoes: [
          { tipo: "Almoço", nome: "Frango", ingredientes: ["frango", "arroz"], preparo: "Grelhe.", opcoes: [{ nome: "Tilápia", ingredientes: ["tilápia"] }] },
          { tipo: "Jantar", nome: "Sopa com coentro", ingredientes: ["coentro"], preparo: "" },
        ],
      },
    ],
  };

  it("acha refeições com o alimento, inclusive nas opções alternativas", () => {
    expect(findMealsWithFoods(plan, ["Peixe", "Coentro"])).toEqual([
      { dia: "Segunda", tipo: "Almoço", nome: "Frango", foods: ["Peixe"] },
      { dia: "Segunda", tipo: "Jantar", nome: "Sopa com coentro", foods: ["Coentro"] },
    ]);
  });

  it("plano ausente ou lista vazia não quebra", () => {
    expect(findMealsWithFoods(null, ["Coentro"])).toEqual([]);
    expect(findMealsWithFoods(plan, [])).toEqual([]);
  });
});
