import { describe, expect, it } from "vitest";
import { calcularCobranca } from "./cobranca";

const FUSO = "America/Sao_Paulo";
const tabela = {
  toleranciaMin: 15,
  primeiraHoraCentavos: 1000,
  horaAdicionalCentavos: 500,
  diariaCentavos: 4000,
};
const noturno = {
  nome: "Noturno",
  janela: { diasSemana: [0, 1, 2, 3, 4, 5, 6], inicioMin: 18 * 60, fimMin: 8 * 60 },
};
const t = (iso: string) => new Date(`${iso}-03:00`);

describe("calcularCobranca", () => {
  it("avulso cobra o tempo todo", () => {
    const c = calcularCobranca(t("2026-10-02T09:00"), t("2026-10-02T11:30"), tabela, FUSO, null);
    expect(c).toEqual({
      minutosTotais: 150,
      minutosCobrados: 150,
      valorCentavos: 2000,
      plano: null,
      reserva: null,
    });
  });

  it("reserva paga cobre a janela; só o excedente é cobrado", () => {
    const reserva = { codigo: "K7M2QX", inicioEm: t("2026-10-02T09:00"), fimEm: t("2026-10-02T11:00") };
    const c = calcularCobranca(t("2026-10-02T09:00"), t("2026-10-02T12:30"), tabela, FUSO, null, reserva);
    expect(c.minutosCobrados).toBe(90);
    expect(c.valorCentavos).toBe(1500);
    expect(c.reserva).toBe("K7M2QX");
  });

  it("dentro da janela da reserva não cobra nada", () => {
    const reserva = { codigo: "K7M2QX", inicioEm: t("2026-10-02T09:00"), fimEm: t("2026-10-02T11:00") };
    const c = calcularCobranca(t("2026-10-02T09:05"), t("2026-10-02T10:50"), tabela, FUSO, null, reserva);
    expect(c.valorCentavos).toBe(0);
  });

  it("mensalista noturno dentro da janela não paga", () => {
    const c = calcularCobranca(t("2026-10-02T19:00"), t("2026-10-03T07:30"), tabela, FUSO, noturno);
    expect(c.valorCentavos).toBe(0);
    expect(c.plano).toBe("Noturno");
  });

  it("mensalista noturno paga como avulso o que passou das 8h", () => {
    const c = calcularCobranca(t("2026-10-02T19:00"), t("2026-10-03T10:00"), tabela, FUSO, noturno);
    expect(c.minutosCobrados).toBe(120);
    expect(c.valorCentavos).toBe(1500);
  });
});
