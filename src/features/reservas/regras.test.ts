import { describe, expect, it } from "vitest";
import {
  calcularCancelamento,
  gerarCodigo,
  minutosForaDaReserva,
  periodosSeSobrepoem,
  validarJanela,
  type RegrasReserva,
} from "./regras";

const regras: RegrasReserva = {
  antecedenciaMinMin: 60,
  antecedenciaMaxDias: 7,
  duracaoMaxH: 12,
  cancelamentoPrazoH: 2,
  retencaoPct: 100,
};
const agora = new Date("2026-10-05T12:00:00Z");
const h = (horas: number) => new Date(agora.getTime() + horas * 3_600_000);

describe("validarJanela (RN-02)", () => {
  it("aceita reserva dentro das regras", () => {
    expect(validarJanela(h(2), h(5), agora, regras)).toBeNull();
  });
  it("recusa fim antes do início", () => {
    expect(validarJanela(h(5), h(2), agora, regras)).toMatch(/depois do início/);
  });
  it("recusa antecedência menor que a mínima", () => {
    expect(validarJanela(h(0.5), h(2), agora, regras)).toMatch(/antecedência/);
  });
  it("aceita exatamente a antecedência mínima", () => {
    expect(validarJanela(h(1), h(2), agora, regras)).toBeNull();
  });
  it("recusa além da antecedência máxima", () => {
    expect(validarJanela(h(24 * 8), h(24 * 8 + 1), agora, regras)).toMatch(/7 dias/);
  });
  it("recusa duração acima do máximo, aceita no limite", () => {
    expect(validarJanela(h(2), h(14.5), agora, regras)).toMatch(/12 horas/);
    expect(validarJanela(h(2), h(14), agora, regras)).toBeNull();
  });
});

describe("calcularCancelamento (RN-02)", () => {
  it("pendente não tem o que devolver", () => {
    expect(calcularCancelamento(false, 2000, h(5), agora, regras)).toEqual({
      reembolsoCentavos: 0,
      retidoCentavos: 0,
      noPrazo: true,
    });
  });
  it("paga e no prazo devolve tudo", () => {
    expect(calcularCancelamento(true, 2000, h(3), agora, regras)).toMatchObject({
      reembolsoCentavos: 2000,
      noPrazo: true,
    });
  });
  it("paga e fora do prazo retém a porcentagem", () => {
    const c = calcularCancelamento(true, 2000, h(1), agora, { ...regras, retencaoPct: 50 });
    expect(c).toEqual({ reembolsoCentavos: 1000, retidoCentavos: 1000, noPrazo: false });
  });
  it("retenção de 100% não devolve nada", () => {
    expect(calcularCancelamento(true, 2000, h(1), agora, regras).reembolsoCentavos).toBe(0);
  });
});

describe("periodosSeSobrepoem", () => {
  it("períodos que só se encostam não se sobrepõem", () => {
    expect(periodosSeSobrepoem(h(1), h(2), h(2), h(3))).toBe(false);
  });
  it("detecta sobreposição parcial e total", () => {
    expect(periodosSeSobrepoem(h(1), h(3), h(2), h(4))).toBe(true);
    expect(periodosSeSobrepoem(h(1), h(5), h(2), h(3))).toBe(true);
  });
});

describe("minutosForaDaReserva (RN-05)", () => {
  it("estadia dentro da janela não paga nada a mais", () => {
    expect(minutosForaDaReserva(h(2), h(4), h(1), h(5))).toBe(0);
  });
  it("conta o que passou do fim", () => {
    expect(minutosForaDaReserva(h(2), h(6), h(1), h(5))).toBe(60);
  });
  it("conta a chegada antes do início e a saída depois do fim", () => {
    expect(minutosForaDaReserva(h(0.5), h(6), h(1), h(5))).toBe(90);
  });
});

describe("gerarCodigo", () => {
  it("gera 6 caracteres sem símbolos ambíguos", () => {
    for (let i = 0; i < 200; i++) expect(gerarCodigo()).toMatch(/^[2-9A-HJKMNP-Z]{6}$/);
  });
});
