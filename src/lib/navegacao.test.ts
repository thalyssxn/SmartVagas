import { describe, expect, it } from "vitest";
import { caminhoSeguro } from "./navegacao";

describe("caminhoSeguro", () => {
  it("aceita caminho interno", () => {
    expect(caminhoSeguro("/cliente/reservar?estacionamento=1")).toBe(
      "/cliente/reservar?estacionamento=1",
    );
  });

  it("recusa outro site, caminho protocol-relative e barra invertida", () => {
    expect(caminhoSeguro("https://golpe.test")).toBeUndefined();
    expect(caminhoSeguro("//golpe.test")).toBeUndefined();
    expect(caminhoSeguro("/\\golpe.test")).toBeUndefined();
  });

  it("recusa o que não é texto", () => {
    expect(caminhoSeguro(undefined)).toBeUndefined();
    expect(caminhoSeguro(["/a"])).toBeUndefined();
  });
});
