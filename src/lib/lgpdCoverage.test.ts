import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { EXPORT_TABLES } from "./exportUserData";

/** Exportar e excluir precisam cobrir as mesmas tabelas (LGPD art. 18, V e VI). */
describe("cobertura de exportação × exclusão", () => {
  const src = readFileSync(resolve(__dirname, "../../supabase/functions/delete-account/index.ts"), "utf8");
  const block = src.slice(src.indexOf("const tables = ["), src.indexOf("]", src.indexOf("const tables = [")));
  const deleted = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

  it("delete-account apaga toda tabela exportada (profiles é apagada à parte)", () => {
    const exported = EXPORT_TABLES.map((t) => t.table).filter((t) => t !== "profiles").sort();
    expect([...deleted].sort()).toEqual(exported);
    expect(src).toContain(".from('profiles').delete()");
  });

  it("delete-account remove as fotos do Storage e o usuário de autenticação", () => {
    expect(src).toMatch(/storage\.from\('progress'\)\.remove/);
    expect(src).toMatch(/auth\.admin\.deleteUser\(userId\)/);
  });
});
