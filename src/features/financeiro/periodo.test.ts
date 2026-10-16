import { describe, expect, it } from "vitest";
import { competenciaValida, deslocarCompetencia, limitesDoMes, nomeDoMes, ultimoDiaDoMes } from "./periodo";

describe("competência", () => {
  it("valida o formato", () => {
    expect(competenciaValida("2026-10")).toBe(true);
    expect(competenciaValida("2026-13")).toBe(false);
    expect(competenciaValida("26-10")).toBe(false);
    expect(competenciaValida(undefined)).toBe(false);
  });
  it("desloca atravessando o ano", () => {
    expect(deslocarCompetencia("2026-12", 1)).toBe("2027-01");
    expect(deslocarCompetencia("2026-01", -1)).toBe("2025-12");
  });
  it("último dia do mês, inclusive bissexto", () => {
    expect(ultimoDiaDoMes("2026-10")).toBe("2026-10-31");
    expect(ultimoDiaDoMes("2026-02")).toBe("2026-02-28");
    expect(ultimoDiaDoMes("2028-02")).toBe("2028-02-29");
  });
  it("limites são meia-noite de São Paulo", () => {
    const { inicio, fim } = limitesDoMes("2026-10", "America/Sao_Paulo");
    expect(inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });
  it("nome em português", () => {
    expect(nomeDoMes("2026-10")).toBe("outubro de 2026");
  });
});
