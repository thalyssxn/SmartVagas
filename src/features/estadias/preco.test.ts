import { describe, expect, it } from "vitest";
import { calcularValorEstadia, type TabelaPreco } from "./preco";

const tabela: TabelaPreco = {
  toleranciaMin: 15,
  primeiraHoraCentavos: 1000,
  horaAdicionalCentavos: 500,
  diariaCentavos: 4000,
};

const H = 60;
const D = 24 * H;

describe("calcularValorEstadia (RN-05)", () => {
  it.each([
    ["zero minutos", 0, 0],
    ["dentro da tolerância", 15, 0],
    ["um minuto após a tolerância cobra a 1ª hora", 16, 1000],
    ["exatamente 1h", H, 1000],
    ["1h01 cobra uma adicional", H + 1, 1500],
    ["2h", 2 * H, 1500],
    ["2h01", 2 * H + 1, 2000],
    ["6h", 6 * H, 3500],
    ["7h bate no teto da diária", 7 * H, 4000],
    ["10h fica no teto", 10 * H, 4000],
    ["24h = 1 diária", D, 4000],
    ["24h10 = 1 diária (resto na tolerância)", D + 10, 4000],
    ["25h = 1 diária + 1ª hora", D + H, 5000],
    ["3 dias = 3 diárias", 3 * D, 12000],
    ["3 dias e 10h = 4 diárias", 3 * D + 10 * H, 16000],
  ])("%s", (_, minutos, esperado) => {
    expect(calcularValorEstadia(minutos, tabela)).toBe(esperado);
  });
});
