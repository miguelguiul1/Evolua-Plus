import { beforeEach, describe, expect, it } from "vitest";
import { clearLocalUserData } from "./localUserData";

describe("clearLocalUserData", () => {
  beforeEach(() => localStorage.clear());

  it("remove dados da conta e mantém preferências do aparelho", () => {
    localStorage.setItem("evoluaPlano:user-1", "{}");
    localStorage.setItem("evolua:lista:abc", "[]");
    localStorage.setItem("evolua:onboardingDraft:v1", "{}");
    localStorage.setItem("evolua:achievements", "[]");
    localStorage.setItem("evoluaNotificacoesLidas", "[]");
    localStorage.setItem("evoluaTheme", "dark");
    localStorage.setItem("evoluaConfig", "{}");
    localStorage.setItem("sb-icmy-auth-token", "x");

    clearLocalUserData();

    expect(Object.keys({ ...localStorage }).sort()).toEqual(["evoluaConfig", "evoluaTheme", "sb-icmy-auth-token"]);
  });
});
