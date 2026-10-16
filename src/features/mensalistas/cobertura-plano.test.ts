import { describe, expect, it } from "vitest";
import { minutosForaDoPlano, type JanelaPlano } from "./cobertura-plano";

const FUSO = "America/Sao_Paulo";
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];

const integral: JanelaPlano = { diasSemana: TODOS_OS_DIAS, inicioMin: null, fimMin: null };
const noturno: JanelaPlano = { diasSemana: TODOS_OS_DIAS, inicioMin: 18 * 60, fimMin: 8 * 60 };
const fimDeSemana: JanelaPlano = { diasSemana: [6, 0], inicioMin: null, fimMin: null };

// 02/10/2026 é sexta-feira; 03/10 sábado; 05/10 segunda.
const t = (iso: string) => new Date(`${iso}-03:00`);

describe("minutosForaDoPlano", () => {
  it("plano integral cobre qualquer estadia", () => {
    expect(minutosForaDoPlano(t("2026-10-02T09:00"), t("2026-10-04T20:00"), integral, FUSO)).toBe(0);
  });

  it("noturno cobre a noite inteira, atravessando a meia-noite", () => {
    expect(minutosForaDoPlano(t("2026-10-02T19:00"), t("2026-10-03T07:00"), noturno, FUSO)).toBe(0);
  });

  it("noturno cobra o trecho antes das 18h", () => {
    expect(minutosForaDoPlano(t("2026-10-02T17:00"), t("2026-10-02T19:00"), noturno, FUSO)).toBe(60);
  });

  it("noturno cobra o trecho depois das 8h usando a janela que começou na véspera", () => {
    expect(minutosForaDoPlano(t("2026-10-03T07:00"), t("2026-10-03T09:00"), noturno, FUSO)).toBe(60);
  });

  it("noturno de vários dias soma os trechos diurnos", () => {
    // sexta 19h → domingo 19h: sábado 08–18 (600) + domingo 08–18 (600)
    expect(minutosForaDoPlano(t("2026-10-02T19:00"), t("2026-10-04T19:00"), noturno, FUSO)).toBe(1200);
  });

  it("fim de semana não cobre a sexta-feira", () => {
    expect(minutosForaDoPlano(t("2026-10-02T23:00"), t("2026-10-03T02:00"), fimDeSemana, FUSO)).toBe(60);
  });

  it("fim de semana não cobre a segunda-feira", () => {
    expect(minutosForaDoPlano(t("2026-10-04T22:00"), t("2026-10-05T01:00"), fimDeSemana, FUSO)).toBe(60);
  });
});
