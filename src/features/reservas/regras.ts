import { randomInt } from "node:crypto";

export type RegrasReserva = {
  antecedenciaMinMin: number;
  antecedenciaMaxDias: number;
  duracaoMaxH: number;
  cancelamentoPrazoH: number;
  retencaoPct: number;
};

const MIN_MS = 60_000;
const HORA_MS = 60 * MIN_MS;
const DIA_MS = 24 * HORA_MS;

/** RN-02: antecedência mínima e máxima, duração máxima. Devolve a mensagem de erro ou null. */
export function validarJanela(inicio: Date, fim: Date, agora: Date, r: RegrasReserva): string | null {
  if (fim <= inicio) return "O fim precisa ser depois do início.";
  if (inicio.getTime() < agora.getTime() + r.antecedenciaMinMin * MIN_MS) {
    return `Reserve com pelo menos ${formatarMinutos(r.antecedenciaMinMin)} de antecedência.`;
  }
  if (inicio.getTime() > agora.getTime() + r.antecedenciaMaxDias * DIA_MS) {
    return `Só é possível reservar com até ${r.antecedenciaMaxDias} dias de antecedência.`;
  }
  if (fim.getTime() - inicio.getTime() > r.duracaoMaxH * HORA_MS) {
    return `A reserva pode durar no máximo ${r.duracaoMaxH} horas.`;
  }
  return null;
}

function formatarMinutos(minutos: number): string {
  return minutos % 60 === 0 ? `${minutos / 60} h` : `${minutos} min`;
}

export type Cancelamento = { reembolsoCentavos: number; retidoCentavos: number; noPrazo: boolean };

/**
 * RN-02: até `cancelamentoPrazoH` antes do início devolve tudo; depois, retém `retencaoPct`.
 * Reserva pendente nunca foi paga, então não há o que devolver.
 */
export function calcularCancelamento(
  paga: boolean,
  valorCentavos: number,
  inicio: Date,
  agora: Date,
  r: RegrasReserva,
): Cancelamento {
  const noPrazo = agora.getTime() <= inicio.getTime() - r.cancelamentoPrazoH * HORA_MS;
  if (!paga) return { reembolsoCentavos: 0, retidoCentavos: 0, noPrazo };
  const retido = noPrazo ? 0 : Math.round((valorCentavos * r.retencaoPct) / 100);
  return { reembolsoCentavos: valorCentavos - retido, retidoCentavos: retido, noPrazo };
}

export function periodosSeSobrepoem(a0: Date, a1: Date, b0: Date, b1: Date): boolean {
  return a0 < b1 && b0 < a1;
}

/** Minutos da estadia fora da janela já paga da reserva: o excedente é cobrado como avulso (RN-05). */
export function minutosForaDaReserva(entrada: Date, saida: Date, inicio: Date, fim: Date): number {
  const total = Math.max(0, saida.getTime() - entrada.getTime());
  const dentro = Math.max(
    0,
    Math.min(saida.getTime(), fim.getTime()) - Math.max(entrada.getTime(), inicio.getTime()),
  );
  return Math.floor((total - dentro) / MIN_MS);
}

// Sem 0/O/1/I/L: o código é lido em voz alta no guichê.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const TAMANHO_CODIGO = 6;

export function gerarCodigo(): string {
  return Array.from({ length: TAMANHO_CODIGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
