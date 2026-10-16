import { z } from "zod";
import { obterOperacao } from "@/features/configuracao/queries";
import { buscarMensalistaPorPlaca, paraPlanoAplicado } from "@/features/mensalistas/queries";
import { planoValeNaEntrada, type StatusAssinatura } from "@/features/mensalistas/status-assinatura";
import { buscarReservaParaEntrada } from "@/features/reservas/entrada";
import { listarVagasDoMapa } from "@/features/vagas/queries";
import { sugerirVaga } from "@/features/vagas/sugestao";
import { placaSchema } from "@/lib/placa";
import { ErroDeNegocio } from "@/lib/resultado";
import { prisma } from "@/server/db";
import type { Contexto } from "@/server/sessao";
import { calcularCobranca, type Cobranca } from "./cobranca";

export type ConsultaDentro = {
  situacao: "dentro";
  estadia: { id: string; placa: string; modelo: string | null; vaga: string; entradaEm: string };
  cobranca: Cobranca;
};

export type ConsultaFora = {
  situacao: "fora";
  placa: string;
  mensalista: { nome: string; plano: string; status: StatusAssinatura; venceEm: string } | null;
  vagaSugeridaId: string | null;
  vagaFixaId: string | null;
  /** Reserva paga do motorista para agora: a entrada vai para a vaga dela. */
  reserva: { codigo: string; vaga: string } | null;
};

export type ConsultaPlaca = ConsultaDentro | ConsultaFora;

export const consultaSchema = z.union([
  z.object({ placa: placaSchema }),
  z.object({ estadiaId: z.uuid() }),
]);

const selecaoEstadiaAberta = {
  id: true,
  placa: true,
  modelo: true,
  entradaEm: true,
  vaga: { select: { numero: true } },
  reserva: { select: { codigo: true, inicioEm: true, fimEm: true } },
  assinatura: {
    select: { plano: { select: { nome: true, diasSemana: true, inicioMin: true, fimMin: true } } },
  },
} as const;

/** RF-04: um campo só. Placa dentro → saída com valor; placa fora → entrada com vaga sugerida. */
export async function consultar(
  contexto: Contexto,
  entrada: z.input<typeof consultaSchema>,
): Promise<ConsultaPlaca> {
  const filtro = consultaSchema.parse(entrada);
  const op = await obterOperacao(contexto.estacionamentoId);

  const porPlacaOuId = "placa" in filtro ? { placa: filtro.placa } : { id: filtro.estadiaId };
  const aberta = await prisma.estadia.findFirst({
    where: { estacionamentoId: contexto.estacionamentoId, saidaEm: null, ...porPlacaOuId },
    select: selecaoEstadiaAberta,
  });

  if (aberta) {
    const plano = aberta.assinatura ? paraPlanoAplicado(aberta.assinatura.plano) : null;
    return {
      situacao: "dentro",
      estadia: {
        id: aberta.id,
        placa: aberta.placa,
        modelo: aberta.modelo,
        vaga: aberta.vaga.numero,
        entradaEm: aberta.entradaEm.toISOString(),
      },
      cobranca: calcularCobranca(aberta.entradaEm, op.agora, op.tabela, op.fuso, plano, aberta.reserva),
    };
  }

  if (!("placa" in filtro)) {
    throw new ErroDeNegocio("estadia_inexistente", "Esse carro já saiu.");
  }

  const mensalista = await buscarMensalistaPorPlaca(contexto.estacionamentoId, filtro.placa, op);
  const vagaFixaId =
    mensalista && planoValeNaEntrada(mensalista.status) ? mensalista.vagaFixaId : null;
  const reserva = await buscarReservaParaEntrada(contexto.estacionamentoId, filtro.placa, op);
  const vagas = await listarVagasDoMapa(contexto.estacionamentoId, op);

  return {
    situacao: "fora",
    placa: filtro.placa,
    mensalista: mensalista && {
      nome: mensalista.nome,
      plano: mensalista.plano.nome,
      status: mensalista.status,
      venceEm: mensalista.venceEm,
    },
    vagaSugeridaId: sugerirVaga(vagas, reserva?.vagaId ?? vagaFixaId),
    vagaFixaId: reserva?.vagaId ?? vagaFixaId,
    reserva: reserva && { codigo: reserva.codigo, vaga: reserva.vaga.numero },
  };
}
