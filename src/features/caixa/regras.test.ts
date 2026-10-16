import { describe, expect, it } from "vitest";
import { diferencaDeCaixa, esperadoNaGaveta } from "./regras";

describe("caixa por turno (RF-07d)", () => {
  it("esperado = troco + dinheiro, ignorando Pix e cartão", () => {
    expect(
      esperadoNaGaveta(5000, { dinheiroCentavos: 12000, pixCentavos: 30000, cartaoCentavos: 8000 }),
    ).toBe(17000);
  });
  it("diferença negativa é falta, positiva é sobra", () => {
    expect(diferencaDeCaixa(16500, 17000)).toBe(-500);
    expect(diferencaDeCaixa(17200, 17000)).toBe(200);
    expect(diferencaDeCaixa(17000, 17000)).toBe(0);
  });
});
