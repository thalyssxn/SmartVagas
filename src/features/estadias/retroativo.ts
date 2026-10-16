import { z } from "zod";
import { obterOperacao } from "@/features/configuracao/queries";
import { buscarMensalistaPorPlaca } from "@/features/mensalistas/queries";
import { planoValeNaEntrada } from "@/features/mensalistas/status-assinatura";
import { placaSchema } from "@/lib/placa";
import { ErroDeNegocio } from "@/lib/resultado";
import { lerHorarioLocal } from "@/lib/tempo";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma } from "@/server/db";
import type { Contexto } from "@/server/sessao";
import { calcularCobranca } from "./cobranca";

const SEM_FIM = new Date("9999-12-31T00:00:00Z");

export const retroativoSchema = z.object({
  placa: placaSchema,
  vagaId: z.uuid("Escolha a vaga."),
  modelo: z.string().trim().max(40).optional(),
  entrada: z.string().min(1, "Informe a hora de entrada."),
  /** Vazio = o carro ainda está dentro. */
  saida: z.string().optional(),
  formaPagamento: z.enum(["dinheiro", "pix", "cartao"]).optional(),
});

/**
 * RF-04c: registra depois o que aconteceu com a internet fora (ficha de papel).
 * Fica marcada `retroativa` e auditada. Não entra no caixa do turno atual:
 * o dinheiro foi recebido em outro momento.
 */
export async function lancarRetroativo(contexto: Contexto, entrada: z.input<typeof retroativoSchema>) {
  const dados = retroativoSchema.parse(entrada);
  const { estacionamentoId } = contexto;
  const op = await obterOperacao(estacionamentoId);

  const entradaEm = lerHorarioLocal(dados.entrada, op.fuso);
  const saidaEm = dados.saida ? lerHorarioLocal(dados.saida, op.fuso) : null;
  if (!entradaEm || (dados.saida && !saidaEm)) throw new ErroDeNegocio("horario_invalido", "Data ou hora inválida.");
  if (entradaEm > op.agora) throw new ErroDeNegocio("horario_futuro", "A entrada não pode ser no futuro.");
  if (saidaEm && saidaEm > op.agora) throw new ErroDeNegocio("horario_futuro", "A saída não pode ser no futuro.");
  if (saidaEm && saidaEm <= entradaEm) throw new ErroDeNegocio("horario_invalido", "A saída precisa ser depois da entrada.");

  const vaga = await prisma.vaga.findFirst({
    where: { id: dados.vagaId, estacionamentoId },
    select: { numero: true },
  });
  if (!vaga) throw new ErroDeNegocio("vaga_inexistente", "Vaga não encontrada.");

  const choque = await prisma.estadia.findFirst({
    where: {
      estacionamentoId,
      AND: [
        { OR: [{ vagaId: dados.vagaId }, { placa: dados.placa }] },
        { entradaEm: { lt: saidaEm ?? SEM_FIM } },
        { OR: [{ saidaEm: null }, { saidaEm: { gt: entradaEm } }] },
      ],
    },
    select: { placa: true, vaga: { select: { numero: true } } },
  });
  if (choque) {
    throw new ErroDeNegocio(
      "periodo_ocupado",
      `Esse período conflita com ${choque.placa} na vaga ${choque.vaga.numero}.`,
    );
  }

  const mensalista = await buscarMensalistaPorPlaca(estacionamentoId, dados.placa, op);
  const assinaturaId = mensalista && planoValeNaEntrada(mensalista.status) ? mensalista.assinaturaId : null;
  const plano = assinaturaId && mensalista ? mensalista.plano : null;
  const cobranca = saidaEm ? calcularCobranca(entradaEm, saidaEm, op.tabela, op.fuso, plano) : null;
  const valor = cobranca?.valorCentavos ?? null;
  if (valor && valor > 0 && !dados.formaPagamento) {
    throw new ErroDeNegocio("forma_pagamento", `Escolha a forma de pagamento (valor ${(valor / 100).toFixed(2).replace(".", ",")}).`);
  }

  return prisma.$transaction(async (tx) => {
    const estadia = await tx.estadia.create({
      data: {
        estacionamentoId,
        vagaId: dados.vagaId,
        placa: dados.placa,
        modelo: dados.modelo || null,
        entradaEm,
        saidaEm,
        valorCentavos: valor,
        formaPagamento: valor && valor > 0 ? dados.formaPagamento : null,
        assinaturaId,
        retroativa: true,
        entradaPorId: contexto.usuarioId,
        saidaPorId: saidaEm ? contexto.usuarioId : null,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "estadia.retroativa",
      entidade: "estadia",
      entidadeId: estadia.id,
      dados: {
        placa: dados.placa,
        vaga: vaga.numero,
        entradaEm: entradaEm.toISOString(),
        saidaEm: saidaEm?.toISOString() ?? null,
        valorCentavos: valor,
      },
    });
    return { placa: dados.placa, vaga: vaga.numero, valorCentavos: valor, aberta: saidaEm === null };
  });
}
