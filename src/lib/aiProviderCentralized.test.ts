import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** As 8 funções de IA só falam com o provedor pelo módulo central (_shared/aiClient.ts). */
const FUNCTIONS = [
  "analyze-fridge", "food-scan", "meal-plan", "meal-swap",
  "myth-checker", "nutrition-chat", "nutrition-tracker", "portion-scanner",
];
const read = (f: string) => readFileSync(resolve(__dirname, `../../supabase/functions/${f}/index.ts`), "utf8");

describe("provedor de IA centralizado", () => {
  it.each(FUNCTIONS)("%s usa chatCompletion do aiClient, sem URL, chave ou modelo próprios", (f) => {
    const src = read(f);
    expect(src).toContain('from "../_shared/aiClient.ts"');
    expect(src).toMatch(/chatCompletion\(aiConfig/);
    expect(src).not.toMatch(/LOVABLE_API_KEY|ai\.gateway\.lovable\.dev|generativelanguage\.googleapis|model:\s*"/);
    expect(src).not.toMatch(/fetch\(\s*["'`]https?:/);
  });

  it("o módulo central concentra URL, modelo e chave", () => {
    const src = readFileSync(resolve(__dirname, "../../supabase/functions/_shared/aiClient.ts"), "utf8");
    expect(src).toContain("GEMINI_API_KEY");
    expect(src).toContain("AI_BASE_URL");
    expect(src).toContain("AI_MODEL");
  });
});
