import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DislikedFoodsEditor from "./DislikedFoodsEditor";

const GRID = ["Peixe", "Leite", "Tomate"];

/** Estado real (controlado) para testar o fluxo como na página. */
const Harness = ({ initial = [] as string[] }) => {
  const [list, setList] = useState<string[]>(initial);
  return (
    <>
      <DislikedFoodsEditor disliked={list} onChange={setList} gridFoods={GRID} />
      <output data-testid="list">{JSON.stringify(list)}</output>
    </>
  );
};

const list = () => JSON.parse(screen.getByTestId("list").textContent ?? "[]");
const type = (value: string) => {
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
};

describe("DislikedFoodsEditor", () => {
  it("frase natural vira vários itens na mesma lista da grade, sem duplicar", () => {
    render(<Harness initial={["Tomate"]} />);
    type("não gosto de fígado, jiló e coentro; tomates");
    expect(list()).toEqual(["Tomate", "Fígado", "Jiló", "Coentro"]);
  });

  it("texto que não é alimento recebe aviso gentil e pode ser adicionado mesmo assim", () => {
    render(<Harness />);
    type("asdfgh");
    expect(list()).toEqual([]);
    expect(screen.getByText(/não reconhecemos “asdfgh” como alimento/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("adicione assim mesmo"));
    expect(list()).toEqual(["asdfgh"]);
  });

  it("autocomplete sugere do catálogo e aceita a sugestão", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "jil" } });
    fireEvent.click(screen.getByRole("button", { name: "Jiló" }));
    expect(list()).toEqual(["Jiló"]);
  });

  it("categoria ampla mostra o que foi entendido e Ajustar troca pelos itens escolhidos", () => {
    render(<Harness initial={["Peixe"]} />);
    expect(screen.getByText(/inclui tilápia, salmão, sardinha, atum e mais/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    // Desmarca tudo menos tilápia e salmão.
    const keep = new Set(["tilápia", "salmão"]);
    for (const chip of screen.getAllByRole("button", { pressed: true })) {
      if (!keep.has(chip.textContent ?? "")) fireEvent.click(chip);
    }
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(list()).toEqual(["Tilápia", "Salmão"]);
  });

  it("lista completa permite remover itens da grade e do texto livre", () => {
    render(<Harness initial={["Leite", "Jiló"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover Leite da lista" }));
    expect(list()).toEqual(["Jiló"]);
  });
});
