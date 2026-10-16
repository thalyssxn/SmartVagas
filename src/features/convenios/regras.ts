import { calcularValorEstadia, type TabelaPreco } from "@/features/estadias/preco";
import type { TipoDesconto } from "@/generated/prisma/enums";

export type RegraConvenio = { tipoDesconto: TipoDesconto; valorDesconto: number };

export type AplicacaoConvenio = { descontoCentavos: number; valorFinalCentavos: number };

/**
 * Quanto o convênio abate da saída. Nunca passa do valor cobrado nem fica negativo.
 * - percentual: % do valor;
 * - minutos: os primeiros N minutos cobrados ficam por conta do parceiro (recalcula a tabela sem eles);
 * - valor: abate um valor fixo em centavos.
 */
export function aplicarConvenio(
  valorCentavos: number,
  minutosCobrados: number,
  regra: RegraConvenio,
  tabela: TabelaPreco,
): AplicacaoConvenio {
  let desconto = 0;
  if (regra.tipoDesconto === "percentual") {
    desconto = Math.round((valorCentavos * Math.min(100, Math.max(0, regra.valorDesconto))) / 100);
  } else if (regra.tipoDesconto === "minutos") {
    const restante = Math.max(0, minutosCobrados - regra.valorDesconto);
    desconto = valorCentavos - calcularValorEstadia(restante, tabela);
  } else {
    desconto = regra.valorDesconto;
  }
  desconto = Math.min(valorCentavos, Math.max(0, desconto));
  return { descontoCentavos: desconto, valorFinalCentavos: valorCentavos - desconto };
}

export function convenioValido(validoAte: string | null, hoje: string): boolean {
  return validoAte === null || validoAte >= hoje;
}

export function descreverDesconto(regra: RegraConvenio): string {
  if (regra.tipoDesconto === "percentual") return `${regra.valorDesconto}% de desconto`;
  if (regra.tipoDesconto === "minutos") {
    const h = Math.floor(regra.valorDesconto / 60);
    const m = regra.valorDesconto % 60;
    const tempo = h > 0 ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`;
    return `${tempo} grátis`;
  }
  return `${(regra.valorDesconto / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de desconto`;
}
