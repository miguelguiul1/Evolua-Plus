import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUser = vi.fn();
const insert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { updateUser: (...a: unknown[]) => updateUser(...a) },
    from: () => ({ insert: (...a: unknown[]) => insert(...a) }),
  },
}));

import {
  CONSENT_VERSION, consentsFromMetadata, consentsFromRows, hasConsent, isMissingTableError,
  mergeConsents, recordConsents,
} from "./consent";
import type { User } from "@supabase/supabase-js";

const entry = (granted: boolean, at: string, version = CONSENT_VERSION) => ({ granted, version, at });

describe("consentimento", () => {
  beforeEach(() => {
    updateUser.mockReset().mockResolvedValue({ error: null });
    insert.mockReset().mockResolvedValue({ error: null });
  });

  it("lê o user_metadata e ignora formatos inválidos", () => {
    const s = consentsFromMetadata({ consents: { health_data: entry(true, "2026-09-30T10:00:00Z"), ai_processing: { granted: "sim" } } });
    expect(s.health_data?.granted).toBe(true);
    expect(s.ai_processing).toBeNull();
    expect(consentsFromMetadata(null)).toEqual({ health_data: null, ai_processing: null });
  });

  it("no histórico vale a linha mais recente de cada finalidade", () => {
    const s = consentsFromRows([
      { purpose: "ai_processing", granted: true, text_version: "v", created_at: "2026-09-30T10:00:00Z" },
      { purpose: "ai_processing", granted: false, text_version: "v", created_at: "2026-09-30T11:00:00Z" },
      { purpose: "marketing", granted: true, text_version: "v", created_at: "2026-09-30T12:00:00Z" },
    ]);
    expect(s.ai_processing?.granted).toBe(false);
    expect(s.health_data).toBeNull();
  });

  it("merge: revogação mais nova no metadata vence concessão antiga no histórico", () => {
    const meta = { health_data: entry(true, "2026-09-30T09:00:00Z"), ai_processing: entry(false, "2026-09-30T12:00:00Z") };
    const rows = { health_data: null, ai_processing: entry(true, "2026-09-30T10:00:00Z") };
    const m = mergeConsents(meta, rows);
    expect(hasConsent(m, "ai_processing")).toBe(false);
    expect(hasConsent(m, "health_data")).toBe(true);
  });

  it("versão antiga do texto exige novo consentimento", () => {
    const s = { health_data: entry(true, "2026-01-01T00:00:00Z", "2020-01-01"), ai_processing: null };
    expect(hasConsent(s, "health_data")).toBe(false);
  });

  it("revogar dados de saúde revoga também a IA e grava metadata + histórico", async () => {
    const user = { id: "u1", user_metadata: { consents: { health_data: entry(true, "x"), ai_processing: entry(true, "x") } } } as unknown as User;
    const next = await recordConsents(user, { health_data: false }, "settings");
    expect(next.health_data?.granted).toBe(false);
    expect(next.ai_processing?.granted).toBe(false);
    expect(updateUser).toHaveBeenCalledWith({ data: { consents: next } });
    const rows = insert.mock.calls[0][0] as { purpose: string; granted: boolean; source: string }[];
    expect(rows.map((r) => [r.purpose, r.granted, r.source])).toEqual([
      ["health_data", false, "settings"], ["ai_processing", false, "settings"],
    ]);
  });

  it("tabela de histórico ausente (migration pendente) não quebra a gravação", async () => {
    insert.mockResolvedValue({ error: { code: "PGRST205", message: "Could not find the table 'public.user_consents'" } });
    const user = { id: "u1", user_metadata: {} } as unknown as User;
    await expect(recordConsents(user, { health_data: true, ai_processing: true }, "app")).resolves.toBeTruthy();
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
  });

  it("falha no user_metadata interrompe (é o que libera a IA no servidor)", async () => {
    updateUser.mockResolvedValue({ error: new Error("rede") });
    const user = { id: "u1", user_metadata: {} } as unknown as User;
    await expect(recordConsents(user, { health_data: true }, "app")).rejects.toThrow("rede");
    expect(insert).not.toHaveBeenCalled();
  });
});
