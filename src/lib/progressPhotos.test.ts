import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { storagePathsOf, toStoragePath } from "./progressPhotos";

const U = "5f1c2d3e-0000-4000-8000-000000000001";

describe("toStoragePath", () => {
  it("mantém o caminho salvo pelo app", () => {
    expect(toStoragePath(`${U}/log-antes-1.jpg`)).toBe(`${U}/log-antes-1.jpg`);
  });
  it("aceita URL pública, assinada e autenticada de registros antigos", () => {
    const base = "https://icmyqmvcwzdfleuxyiux.supabase.co/storage/v1/object";
    expect(toStoragePath(`${base}/public/progress/${U}/a.jpg`)).toBe(`${U}/a.jpg`);
    expect(toStoragePath(`${base}/sign/progress/${U}/a.jpg?token=abc`)).toBe(`${U}/a.jpg`);
    expect(toStoragePath(`${base}/authenticated/progress/${U}/a%20b.jpg`)).toBe(`${U}/a b.jpg`);
  });
  it("remove prefixo do bucket e barra inicial", () => {
    expect(toStoragePath(`progress/${U}/a.jpg`)).toBe(`${U}/a.jpg`);
    expect(toStoragePath(`/${U}/a.jpg`)).toBe(`${U}/a.jpg`);
  });
  it("descarta o que não é do bucket progress", () => {
    expect(toStoragePath("https://exemplo.com/foto.jpg")).toBeNull();
    expect(toStoragePath("")).toBeNull();
    expect(toStoragePath(null)).toBeNull();
    expect(storagePathsOf(["https://exemplo.com/x.jpg", `${U}/b.jpg`])).toEqual([`${U}/b.jpg`]);
  });
});
