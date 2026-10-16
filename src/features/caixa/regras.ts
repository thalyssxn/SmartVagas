export type RecebimentosDoTurno = { dinheiroCentavos: number; pixCentavos: number; cartaoCentavos: number };

/** RF-07d: só dinheiro fica na gaveta. Pix e cartão não entram na conferência. */
export function esperadoNaGaveta(trocoInicialCentavos: number, recebimentos: RecebimentosDoTurno): number {
  return trocoInicialCentavos + recebimentos.dinheiroCentavos;
}

/** Positivo = sobra; negativo = falta. */
export function diferencaDeCaixa(contadoCentavos: number, esperadoCentavos: number): number {
  return contadoCentavos - esperadoCentavos;
}
