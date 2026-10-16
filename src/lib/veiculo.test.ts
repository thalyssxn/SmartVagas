import { describe, expect, it } from "vitest";
import { contarPorVeiculo, lotacao, vagaServeParaVeiculo } from "./veiculo";

describe("vagaServeParaVeiculo", () => {
  it("carro cabe na comum, na de recarga e na grande", () => {
    expect(vagaServeParaVeiculo("comum", "carro")).toBe(true);
    expect(vagaServeParaVeiculo("eletrica", "carro")).toBe(true);
    expect(vagaServeParaVeiculo("grande", "carro")).toBe(true);
    expect(vagaServeParaVeiculo("moto", "carro")).toBe(false);
  });

  it("caminhonete só cabe na vaga grande", () => {
    expect(vagaServeParaVeiculo("grande", "grande")).toBe(true);
    expect(vagaServeParaVeiculo("comum", "grande")).toBe(false);
  });

  it("moto só na vaga de moto", () => {
    expect(vagaServeParaVeiculo("moto", "moto")).toBe(true);
    expect(vagaServeParaVeiculo("comum", "moto")).toBe(false);
  });

  it("PCD e idoso não entram no filtro automático", () => {
    expect(vagaServeParaVeiculo("pcd", "carro")).toBe(false);
    expect(vagaServeParaVeiculo("idoso", "carro")).toBe(false);
  });
});

describe("contarPorVeiculo", () => {
  it("soma os tipos de vaga de cada veículo", () => {
    expect(contarPorVeiculo({ comum: 10, eletrica: 1, grande: 2, moto: 4, pcd: 2 })).toEqual({
      carro: 13,
      moto: 4,
      grande: 2,
    });
  });

  it("tipos ausentes contam zero", () => {
    expect(contarPorVeiculo({})).toEqual({ carro: 0, moto: 0, grande: 0 });
  });
});

describe("lotacao", () => {
  it("lotado sem vagas livres ou sem vagas", () => {
    expect(lotacao(0, 50)).toBe("lotado");
    expect(lotacao(0, 0)).toBe("lotado");
  });

  it("quase lotado com poucas vagas", () => {
    expect(lotacao(3, 50)).toBe("quase_lotado");
    expect(lotacao(7, 50)).toBe("quase_lotado");
  });

  it("livre com folga", () => {
    expect(lotacao(20, 50)).toBe("livre");
    expect(lotacao(4, 10)).toBe("livre");
  });
});
