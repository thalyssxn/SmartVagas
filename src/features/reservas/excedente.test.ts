import { describe, expect, it } from "vitest";
import type { TabelaPreco } from "@/features/estadias/preco";
import { avisoTaxaAdicional, calcularExcedente } from "./excedente";

const TABELA: TabelaPreco = {
  toleranciaMin: 15,
  primeiraHoraCentavos: 1000,
  horaAdicionalCentavos: 500,
  diariaCentavos: 4000,
};
const FIM = new Date("2026-10-16T18:00:00Z");
const depois = (min: number) => new Date(FIM.getTime() + min * 60_000);

describe("calcularExcedente", () => {
  it("antes do fim: conta os minutos que faltam e não cobra", () => {
    expect(calcularExcedente(FIM, depois(-25), TABELA)).toEqual({
      minutosRestantes: 25,
      minutosExcedidos: 0,
      taxaCentavos: 0,
    });
  });

  it("dentro da tolerância: passou, mas ainda sem taxa", () => {
    expect(calcularExcedente(FIM, depois(10), TABELA)).toEqual({
      minutosRestantes: 0,
      minutosExcedidos: 10,
      taxaCentavos: 0,
    });
  });

  it("passou 40 min: cobra a primeira hora", () => {
    expect(calcularExcedente(FIM, depois(40), TABELA).taxaCentavos).toBe(1000);
  });

  it("passou 2h10: primeira hora + 2 adicionais", () => {
    expect(calcularExcedente(FIM, depois(130), TABELA).taxaCentavos).toBe(2000);
  });
});

describe("avisoTaxaAdicional", () => {
  it("menciona a tolerância e os valores", () => {
    const texto = avisoTaxaAdicional(TABELA);
    expect(texto).toContain("15 min de tolerância");
    expect(texto).toContain("10,00");
    expect(texto).toContain("5,00");
  });

  it("sem tolerância não fala dela", () => {
    expect(avisoTaxaAdicional({ ...TABELA, toleranciaMin: 0 })).not.toContain("tolerância");
  });
});
