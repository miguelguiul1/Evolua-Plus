import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const update = vi.fn().mockResolvedValue({});
vi.mock("@/hooks/useConsent", () => ({ useConsent: () => ({ update }) }));
vi.mock("@/contexts/useAuth", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

import ConsentScreen from "./ConsentScreen";

const setup = () =>
  render(
    <MemoryRouter>
      <ConsentScreen />
    </MemoryRouter>,
  );

describe("ConsentScreen", () => {
  it("nada vem marcado e Continuar só libera com a caixa de saúde", async () => {
    setup();
    const health = screen.getByRole("checkbox", { name: /dados de saúde \(peso/i });
    const ai = screen.getByRole("checkbox", { name: /provedores de inteligência artificial/i });
    const cont = screen.getByRole("button", { name: "Continuar" });

    expect(health).not.toBeChecked();
    expect(ai).not.toBeChecked();
    expect(ai).toBeDisabled();
    expect(cont).toBeDisabled();
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacidade");

    fireEvent.click(health);
    expect(cont).toBeEnabled();
    expect(ai).toBeEnabled();

    fireEvent.click(cont);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ health_data: true, ai_processing: false }, "app"));
  });

  it("registra a IA só se a pessoa marcar", async () => {
    update.mockClear();
    setup();
    fireEvent.click(screen.getByRole("checkbox", { name: /dados de saúde \(peso/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /provedores de inteligência artificial/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ health_data: true, ai_processing: true }, "app"));
  });
});
