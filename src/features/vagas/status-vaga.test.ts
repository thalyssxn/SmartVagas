import { describe, expect, it } from "vitest";
import { statusDaVaga } from "./status-vaga";

describe("statusDaVaga", () => {
  it("bloqueio vence tudo", () => {
    expect(
      statusDaVaga({ ativa: false, temEstadiaAberta: true, temMensalistaFixoValendo: true }),
    ).toBe("bloqueada");
  });

  it("carro dentro vence a reserva do mensalista", () => {
    expect(
      statusDaVaga({ ativa: true, temEstadiaAberta: true, temMensalistaFixoValendo: true }),
    ).toBe("ocupada");
  });

  it("vaga fixa de mensalista fora do pátio aparece reservada", () => {
    expect(
      statusDaVaga({ ativa: true, temEstadiaAberta: false, temMensalistaFixoValendo: true }),
    ).toBe("reservada");
  });

  it("reserva de motorista começando em breve também reserva a vaga", () => {
    expect(
      statusDaVaga({
        ativa: true,
        temEstadiaAberta: false,
        temMensalistaFixoValendo: false,
        temReservaProxima: true,
      }),
    ).toBe("reservada");
  });

  it("sem nada, livre", () => {
    expect(
      statusDaVaga({ ativa: true, temEstadiaAberta: false, temMensalistaFixoValendo: false }),
    ).toBe("livre");
  });
});
