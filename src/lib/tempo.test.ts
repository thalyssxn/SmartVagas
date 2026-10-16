import { describe, expect, it } from "vitest";
import { diaCivil, formatarDuracao, inicioDoDia, somarMeses } from "./tempo";

const FUSO = "America/Sao_Paulo";

describe("somarMeses", () => {
  it.each([
    ["2026-10-10", "2026-11-10"],
    ["2026-12-15", "2027-01-15"],
    ["2026-01-31", "2026-02-28"],
    ["2028-01-31", "2028-02-29"],
  ])("%s + 1 mês = %s", (dia, esperado) => {
    expect(somarMeses(dia, 1)).toBe(esperado);
  });
});

describe("dia civil no fuso", () => {
  it("23h30 em São Paulo ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC", () => {
    expect(diaCivil(new Date("2026-10-02T02:30:00Z"), FUSO)).toBe("2026-10-01");
  });

  it("início do dia é meia-noite local", () => {
    expect(inicioDoDia(new Date("2026-10-01T15:00:00Z"), FUSO).toISOString()).toBe(
      "2026-10-01T03:00:00.000Z",
    );
  });
});

describe("formatarDuracao", () => {
  it.each([
    [45, "45 min"],
    [125, "2h05"],
    [1500, "1d 1h00"],
  ])("%i min → %s", (minutos, esperado) => {
    expect(formatarDuracao(minutos)).toBe(esperado);
  });
});
