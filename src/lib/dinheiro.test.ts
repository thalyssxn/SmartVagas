import { describe, expect, it } from "vitest";
import { formatarCentavos, lerReais, paraReais } from "./dinheiro";

describe("lerReais", () => {
  it.each([
    ["12,50", 1250],
    ["R$ 12,50", 1250],
    ["1.234,50", 123450],
    ["12.5", 1250],
    ["12", 1200],
    ["0,05", 5],
    ["1.000", 100000],
    ["  7 ", 700],
  ])("%s → %i", (texto, esperado) => {
    expect(lerReais(texto)).toBe(esperado);
  });

  it.each(["", "abc", "12,345", "-5", "1,2,3", "12,"])("rejeita %j", (texto) => {
    expect(lerReais(texto)).toBeNull();
  });
});

describe("paraReais / formatarCentavos", () => {
  it("ida e volta", () => {
    expect(lerReais(paraReais(123456))).toBe(123456);
  });
  it("formata em real", () => {
    expect(formatarCentavos(1250).replace(/\s/g, " ")).toBe("R$ 12,50");
  });
});
