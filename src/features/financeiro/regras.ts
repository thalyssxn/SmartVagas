export type Receitas = {
  avulsoCentavos: number;
  mensalidadesCentavos: number;
  reservasCentavos: number;
  /** Reembolsos já devolvidos no mês: saem da receita (RN-08). */
  reembolsosCentavos: number;
};

export function totalDeReceitas(r: Receitas): number {
  return r.avulsoCentavos + r.mensalidadesCentavos + r.reservasCentavos - r.reembolsosCentavos;
}

/** RN-08: Lucro = receitas em regime de caixa - custos lançados (folha incluída). */
export function resumirMes(receitas: Receitas, custoCentavos: number) {
  const receitaCentavos = totalDeReceitas(receitas);
  return { receitaCentavos, custoCentavos, lucroCentavos: receitaCentavos - custoCentavos };
}

/** Custo real de um funcionário: sem os encargos o lucro aparece maior do que é. */
export function custoDoFuncionario(salarioCentavos: number, encargosCentavos: number): number {
  return salarioCentavos + encargosCentavos;
}

function celula(valor: string | number): string {
  const texto = String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV para o Excel brasileiro: ponto e vírgula, CRLF e BOM para os acentos. */
export function montarCsv(linhas: (string | number)[][]): string {
  return "﻿" + linhas.map((linha) => linha.map(celula).join(";")).join("\r\n") + "\r\n";
}

/** 12345 → "123,45" (sem símbolo, para planilha). */
export function centavosParaPlanilha(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}
