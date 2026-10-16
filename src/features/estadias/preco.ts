export type TabelaPreco = {
  toleranciaMin: number;
  primeiraHoraCentavos: number;
  horaAdicionalCentavos: number;
  diariaCentavos: number;
};

const MINUTOS_HORA = 60;
const MINUTOS_DIA = 24 * MINUTOS_HORA;

/**
 * RN-05. Cada bloco completo de 24h cobra uma diária; o que sobra segue a
 * tabela horária com teto de uma diária. Sem isso, 3 dias pagariam 1 diária.
 */
export function calcularValorEstadia(minutos: number, tabela: TabelaPreco): number {
  const diasCompletos = Math.floor(minutos / MINUTOS_DIA);
  const resto = minutos % MINUTOS_DIA;
  return diasCompletos * tabela.diariaCentavos + valorDoPeriodoParcial(resto, tabela);
}

function valorDoPeriodoParcial(minutos: number, tabela: TabelaPreco): number {
  if (minutos <= tabela.toleranciaMin) return 0;
  const horasAdicionais = Math.max(0, Math.ceil((minutos - MINUTOS_HORA) / MINUTOS_HORA));
  const valor = tabela.primeiraHoraCentavos + horasAdicionais * tabela.horaAdicionalCentavos;
  return Math.min(tabela.diariaCentavos, valor);
}
