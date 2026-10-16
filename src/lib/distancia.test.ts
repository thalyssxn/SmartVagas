import { describe, expect, it } from "vitest";
import { coordenadasValidas, distanciaKm, formatarDistancia, linkComoChegar } from "./distancia";

const PRACA_SE_SP = { latitude: -23.5503, longitude: -46.6339 };
const CATEDRAL_SOROCABA = { latitude: -23.5015, longitude: -47.4526 };

describe("distanciaKm", () => {
  it("é zero para o mesmo ponto", () => {
    expect(distanciaKm(PRACA_SE_SP, PRACA_SE_SP)).toBe(0);
  });

  it("São Paulo → Sorocaba fica perto de 83 km em linha reta", () => {
    const km = distanciaKm(PRACA_SE_SP, CATEDRAL_SOROCABA);
    expect(km).toBeGreaterThan(82);
    expect(km).toBeLessThan(85);
  });

  it("é simétrica", () => {
    expect(distanciaKm(PRACA_SE_SP, CATEDRAL_SOROCABA)).toBeCloseTo(
      distanciaKm(CATEDRAL_SOROCABA, PRACA_SE_SP),
      9,
    );
  });
});

describe("formatarDistancia", () => {
  it("usa metros abaixo de 1 km, arredondando de 10 em 10", () => {
    expect(formatarDistancia(0.347)).toBe("350 m");
    expect(formatarDistancia(0.001)).toBe("10 m");
  });

  it("usa km com vírgula", () => {
    expect(formatarDistancia(2.44)).toBe("2,4 km");
    expect(formatarDistancia(1)).toBe("1,0 km");
  });

  it("tira a casa decimal em distâncias longas", () => {
    expect(formatarDistancia(83.4)).toBe("83,4 km");
    expect(formatarDistancia(431.6)).toBe("432 km");
  });
});

describe("coordenadasValidas", () => {
  it("aceita lat/long dentro dos limites", () => {
    expect(coordenadasValidas(-23.5, -47.4)).toBe(true);
  });

  it("recusa nulo, NaN e fora dos limites", () => {
    expect(coordenadasValidas(null, -47)).toBe(false);
    expect(coordenadasValidas(Number.NaN, 0)).toBe(false);
    expect(coordenadasValidas(95, 0)).toBe(false);
    expect(coordenadasValidas(0, -181)).toBe(false);
  });
});

describe("linkComoChegar", () => {
  it("usa coordenadas quando existem", () => {
    expect(linkComoChegar(CATEDRAL_SOROCABA, "Rua X")).toContain("destination=-23.5015%2C-47.4526");
  });

  it("cai no endereço sem coordenadas", () => {
    expect(linkComoChegar(null, "Rua X, 10")).toContain("destination=Rua%20X%2C%2010");
  });
});
