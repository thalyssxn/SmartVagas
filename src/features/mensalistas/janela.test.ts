import { describe, expect, it } from "vitest";
import { descreverJanela, hhmmParaMinutos, minutosParaHhmm } from "./janela";

describe("janela do plano", () => {
  it.each([
    ["18:00", 1080],
    ["08:30", 510],
    ["00:00", 0],
    ["23:59", 1439],
  ])("%s ↔ %i", (texto, minutos) => {
    expect(hhmmParaMinutos(texto)).toBe(minutos);
    expect(minutosParaHhmm(minutos)).toBe(texto);
  });

  it.each(["", "24:00", "12:60", "9:00", "abc"])("rejeita %j", (texto) => {
    expect(hhmmParaMinutos(texto)).toBeNull();
  });

  it("descreve os planos do seed", () => {
    expect(descreverJanela({ diasSemana: [0, 1, 2, 3, 4, 5, 6], inicioMin: null, fimMin: null })).toBe("Todos os dias");
    expect(descreverJanela({ diasSemana: [0, 1, 2, 3, 4, 5, 6], inicioMin: 1080, fimMin: 480 })).toBe("Todos os dias, 18:00–08:00");
    expect(descreverJanela({ diasSemana: [6, 0], inicioMin: null, fimMin: null })).toBe("Dom, Sáb");
  });
});
