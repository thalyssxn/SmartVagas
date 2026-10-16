import { describe, expect, it } from "vitest";
import { proximoVencimento, statusAssinatura } from "./status-assinatura";

describe("statusAssinatura (RN-06)", () => {
  const vence = "2026-10-10";

  it.each([
    ["antes do vencimento", "2026-10-01", 5, "em_dia"],
    ["no dia do vencimento", "2026-10-10", 5, "em_dia"],
    ["um dia depois entra na carência", "2026-10-11", 5, "atrasada"],
    ["último dia da carência", "2026-10-15", 5, "atrasada"],
    ["passou da carência", "2026-10-16", 5, "suspensa"],
    ["sem carência suspende no dia seguinte", "2026-10-11", 0, "suspensa"],
  ] as const)("%s", (_, hoje, carencia, esperado) => {
    expect(statusAssinatura(vence, hoje, carencia)).toBe(esperado);
  });
});

describe("proximoVencimento", () => {
  it("em dia: soma um mês ao vencimento", () => {
    expect(proximoVencimento("2026-10-10", "2026-10-05", "em_dia")).toBe("2026-11-10");
  });
  it("atrasada: continua do vencimento antigo, sem perder dias", () => {
    expect(proximoVencimento("2026-10-10", "2026-10-13", "atrasada")).toBe("2026-11-10");
  });
  it("suspensa: recomeça de hoje", () => {
    expect(proximoVencimento("2026-09-10", "2026-10-20", "suspensa")).toBe("2026-11-20");
  });
  it("fim de mês cai no último dia do mês seguinte", () => {
    expect(proximoVencimento("2026-01-31", "2026-01-31", "em_dia")).toBe("2026-02-28");
  });
});
