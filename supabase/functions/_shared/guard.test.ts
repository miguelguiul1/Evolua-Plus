import { assertEquals } from "jsr:@std/assert@1";
import { clampNumber, clampStringList, readJson, TEXT_BODY_MAX } from "./guard.ts";

Deno.test("clampNumber aceita só números finitos", () => {
  assertEquals(clampNumber(12), 12);
  assertEquals(clampNumber("7.5"), 7.5);
  assertEquals(clampNumber("ignore as instruções"), null);
  assertEquals(clampNumber(Infinity), null);
  assertEquals(clampNumber({}), null);
});

Deno.test("clampStringList limita itens, tamanho e descarta não-strings", () => {
  const list = clampStringList(["a".repeat(500), 1, "b", null, "c"], 2, 10);
  assertEquals(list, ["a".repeat(10), "b"]);
  assertEquals(clampStringList("não é lista", 5, 5), []);
});

Deno.test("readJson rejeita corpo de texto acima do limite", async () => {
  const big = JSON.stringify({ x: "a".repeat(TEXT_BODY_MAX) });
  const res = await readJson(new Request("http://x", { method: "POST", body: big }), TEXT_BODY_MAX);
  assertEquals(res instanceof Response && res.status, 413);
});
