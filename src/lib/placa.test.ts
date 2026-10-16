import { describe, expect, it } from "vitest";
import { normalizarPlaca, placaSchema, placaValida } from "./placa";

describe("placa (RN-12)", () => {
  it("normaliza caixa, hífen e espaços", () => {
    expect(normalizarPlaca(" abc-1234 ")).toBe("ABC1234");
  });

  it.each(["ABC1234", "ABC1D23"])("aceita %s", (placa) => {
    expect(placaValida(placa)).toBe(true);
  });

  it.each(["AB12345", "ABCD123", "ABC123", "ABC12345"])("rejeita %s", (placa) => {
    expect(placaValida(placa)).toBe(false);
  });

  it("schema devolve a placa normalizada", () => {
    expect(placaSchema.parse("abc-1d23")).toBe("ABC1D23");
  });
});
