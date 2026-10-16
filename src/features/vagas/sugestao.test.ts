import { describe, expect, it } from "vitest";
import { sugerirVaga, type VagaCandidata } from "./sugestao";

const vaga = (id: string, extra: Partial<VagaCandidata> = {}): VagaCandidata => ({
  id,
  tipo: "comum",
  reservavel: false,
  status: "livre",
  ...extra,
});

describe("sugerirVaga", () => {
  it("mensalista vai para a vaga fixa, que aparece como reservada para ele", () => {
    const vagas = [vaga("a"), vaga("fixa", { status: "reservada" })];
    expect(sugerirVaga(vagas, "fixa")).toBe("fixa");
  });

  it("se a vaga fixa estiver ocupada, cai na regra geral", () => {
    const vagas = [vaga("fixa", { status: "ocupada" }), vaga("b")];
    expect(sugerirVaga(vagas, "fixa")).toBe("b");
  });

  it("prefere comum não-reservável", () => {
    const vagas = [vaga("r", { reservavel: true }), vaga("c")];
    expect(sugerirVaga(vagas, null)).toBe("c");
  });

  it("usa reservável se for a única comum livre", () => {
    const vagas = [vaga("ocupada", { status: "ocupada" }), vaga("r", { reservavel: true })];
    expect(sugerirVaga(vagas, null)).toBe("r");
  });

  it("não sugere vaga especial nem vaga fixa de outro mensalista", () => {
    const vagas = [vaga("pcd", { tipo: "pcd" }), vaga("outro", { status: "reservada" })];
    expect(sugerirVaga(vagas, null)).toBeNull();
  });
});
