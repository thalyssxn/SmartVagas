import { minutosForaDoPlano, type JanelaPlano } from "@/features/mensalistas/cobertura-plano";
import { minutosForaDaReserva } from "@/features/reservas/regras";
import { minutosEntre } from "@/lib/tempo";
import { calcularValorEstadia, type TabelaPreco } from "./preco";

export type PlanoAplicado = { nome: string; janela: JanelaPlano };
export type ReservaAplicada = { codigo: string; inicioEm: Date; fimEm: Date };

export type Cobranca = {
  minutosTotais: number;
  minutosCobrados: number;
  valorCentavos: number;
  plano: string | null;
  reserva: string | null;
};

/**
 * Valor da saída (RN-05). O que o plano ou a reserva já cobre não entra; o excedente é cobrado
 * como avulso. Mensalista tem prioridade se houver os dois.
 */
export function calcularCobranca(
  entrada: Date,
  saida: Date,
  tabela: TabelaPreco,
  fuso: string,
  plano: PlanoAplicado | null,
  reserva: ReservaAplicada | null = null,
): Cobranca {
  const minutosTotais = minutosEntre(entrada, saida);
  let minutosCobrados = minutosTotais;
  if (plano) minutosCobrados = minutosForaDoPlano(entrada, saida, plano.janela, fuso);
  else if (reserva) {
    minutosCobrados = minutosForaDaReserva(entrada, saida, reserva.inicioEm, reserva.fimEm);
  }

  return {
    minutosTotais,
    minutosCobrados,
    valorCentavos: calcularValorEstadia(minutosCobrados, tabela),
    plano: plano?.nome ?? null,
    reserva: !plano && reserva ? reserva.codigo : null,
  };
}
