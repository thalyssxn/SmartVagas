import { describe, expect, it } from "vitest";
import { centavosParaPlanilha, custoDoFuncionario, montarCsv, resumirMes } from "./regras";

describe("resumirMes (RN-08)", () => {
  it("lucro = receitas - reembolsos - custos", () => {
    const r = resumirMes(
      { avulsoCentavos: 500000, mensalidadesCentavos: 250000, reservasCentavos: 30000, reembolsosCentavos: 10000 },
      700000,
    );
    expect(r).toEqual({ receitaCentavos: 770000, custoCentavos: 700000, lucroCentavos: 70000 });
  });
  it("mês no vermelho dá lucro negativo", () => {
    const r = resumirMes(
      { avulsoCentavos: 100000, mensalidadesCentavos: 0, reservasCentavos: 0, reembolsosCentavos: 0 },
      300000,
    );
    expect(r.lucroCentavos).toBe(-200000);
  });
});

describe("custo do funcionário", () => {
  it("inclui os encargos", () => {
    expect(custoDoFuncionario(220000, 88000)).toBe(308000);
  });
});

describe("montarCsv", () => {
  it("usa ; e CRLF, com BOM", () => {
    expect(montarCsv([["a", 1], ["b", 2]])).toBe("﻿a;1\r\nb;2\r\n");
  });
  it("escapa ; aspas e quebra de linha", () => {
    expect(montarCsv([['x;y', 'diz "oi"']])).toBe('﻿"x;y";"diz ""oi"""\r\n');
  });
  it("valor para planilha usa vírgula", () => {
    expect(centavosParaPlanilha(123450)).toBe("1234,50");
  });
});
