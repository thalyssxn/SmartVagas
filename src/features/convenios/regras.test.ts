import { describe, expect, it } from "vitest";
import type { TabelaPreco } from "@/features/estadias/preco";
import { aplicarConvenio, convenioValido, descreverDesconto } from "./regras";

const TABELA: TabelaPreco = {
  toleranciaMin: 15,
  primeiraHoraCentavos: 1000,
  horaAdicionalCentavos: 500,
  diariaCentavos: 4000,
};

describe("aplicarConvenio", () => {
  it("percentual abate a porcentagem do valor", () => {
    expect(
      aplicarConvenio(2000, 180, { tipoDesconto: "percentual", valorDesconto: 50 }, TABELA),
    ).toEqual({
      descontoCentavos: 1000,
      valorFinalCentavos: 1000,
    });
  });

  it("percentual acima de 100 vira 100", () => {
    expect(
      aplicarConvenio(2000, 180, { tipoDesconto: "percentual", valorDesconto: 150 }, TABELA)
        .valorFinalCentavos,
    ).toBe(0);
  });

  it("minutos grátis: 2h de estadia com 1h grátis paga só a 2ª hora como 1ª", () => {
    // 120 min = R$ 15; sem os primeiros 60 sobram 60 min = R$ 10. Desconto R$ 5.
    expect(
      aplicarConvenio(1500, 120, { tipoDesconto: "minutos", valorDesconto: 60 }, TABELA),
    ).toEqual({
      descontoCentavos: 500,
      valorFinalCentavos: 1000,
    });
  });

  it("minutos grátis cobrindo toda a estadia zera a conta", () => {
    expect(
      aplicarConvenio(1000, 50, { tipoDesconto: "minutos", valorDesconto: 120 }, TABELA),
    ).toEqual({
      descontoCentavos: 1000,
      valorFinalCentavos: 0,
    });
  });

  it("valor fixo não passa do total", () => {
    expect(
      aplicarConvenio(800, 40, { tipoDesconto: "valor", valorDesconto: 1000 }, TABELA),
    ).toEqual({
      descontoCentavos: 800,
      valorFinalCentavos: 0,
    });
    expect(
      aplicarConvenio(1500, 120, { tipoDesconto: "valor", valorDesconto: 300 }, TABELA)
        .valorFinalCentavos,
    ).toBe(1200);
  });

  it("saída sem cobrança continua zero", () => {
    expect(
      aplicarConvenio(0, 10, { tipoDesconto: "percentual", valorDesconto: 30 }, TABELA),
    ).toEqual({
      descontoCentavos: 0,
      valorFinalCentavos: 0,
    });
  });
});

describe("convenioValido", () => {
  it("sem data de validade vale sempre", () => {
    expect(convenioValido(null, "2026-10-16")).toBe(true);
  });

  it("vale até o dia, inclusive", () => {
    expect(convenioValido("2026-10-16", "2026-10-16")).toBe(true);
    expect(convenioValido("2026-10-15", "2026-10-16")).toBe(false);
  });
});

describe("descreverDesconto", () => {
  it("descreve cada tipo", () => {
    expect(descreverDesconto({ tipoDesconto: "percentual", valorDesconto: 20 })).toBe(
      "20% de desconto",
    );
    expect(descreverDesconto({ tipoDesconto: "minutos", valorDesconto: 90 })).toBe("1h30 grátis");
    expect(descreverDesconto({ tipoDesconto: "minutos", valorDesconto: 30 })).toBe("30 min grátis");
    expect(descreverDesconto({ tipoDesconto: "minutos", valorDesconto: 120 })).toBe("2h grátis");
    expect(descreverDesconto({ tipoDesconto: "valor", valorDesconto: 500 })).toMatch(
      /5,00 de desconto/,
    );
  });
});
