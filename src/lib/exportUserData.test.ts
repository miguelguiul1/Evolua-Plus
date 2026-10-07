import { describe, expect, it, vi } from "vitest";

const U = "user-1";
const foodRows = Array.from({ length: 1500 }, (_, i) => ({ id: i, user_id: U }));

const from = vi.fn((table: string) => ({
  select: () => ({
    eq: () => ({
      range: async (a: number, b: number) => {
        if (table === "user_consents") return { data: null, error: { code: "PGRST205", message: "Could not find the table 'public.user_consents'" } };
        if (table === "food_log") return { data: foodRows.slice(a, b + 1), error: null };
        if (table === "chat_messages") return { data: [{ id: "c1" }], error: null };
        return { data: [], error: null };
      },
    }),
  }),
}));

const list = vi.fn(async () => ({ data: [{ id: "f1", name: "log-antes-1.jpg" }, { id: null, name: "subpasta" }], error: null }));
const download = vi.fn(async () => ({ data: new Blob(["abc"], { type: "image/jpeg" }), error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (t: string) => from(t), storage: { from: () => ({ list, download }) } },
}));

import { buildUserExport, EXPORT_TABLES } from "./exportUserData";
import type { User } from "@supabase/supabase-js";

describe("buildUserExport", () => {
  it("inclui todas as tabelas, pagina além de 1000 linhas, tolera tabela ausente e embute as fotos", async () => {
    const user = {
      id: U, email: "a@exemplo.com", created_at: "2026-01-01", last_sign_in_at: "2026-09-30",
      app_metadata: { providers: ["email"] }, user_metadata: { full_name: "A", consents: { health_data: { granted: true } } },
    } as unknown as User;
    const out = (await buildUserExport(user)) as unknown as Record<string, unknown>;

    for (const t of EXPORT_TABLES) expect(out).toHaveProperty(t.key);
    expect((out.diario_alimentar as unknown[]).length).toBe(1500);
    expect(out.consentimentos_historico).toEqual([]);
    expect((out.conversas_ia as unknown[]).length).toBe(1);
    expect((out.conta as { dados_do_cadastro: unknown }).dados_do_cadastro).toEqual(user.user_metadata);

    const files = out.fotos_de_evolucao_arquivos as { caminho: string; base64?: string; tipo: string }[];
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ caminho: `${U}/log-antes-1.jpg`, tipo: "image/jpeg", base64: btoa("abc") });
    expect(out.avisos).toEqual([]);
  });

  it("cobre todas as tabelas com dados pessoais do mapa (LGPD_MAPA_DADOS.md)", () => {
    const tables = EXPORT_TABLES.map((t) => t.table).sort();
    expect(tables).toEqual([
      "ai_insights", "ai_memory", "chat_messages", "food_favorites", "food_log", "global_favorites",
      "meal_plans", "profiles", "progress_photos", "scan_history", "user_consents", "user_goals",
      "user_preferences", "user_routine_profile", "water_log", "weight_log",
    ]);
  });
});
