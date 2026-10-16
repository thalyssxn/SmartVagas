import type { Operacao } from "@/features/configuracao/queries";
import { prisma, type Transacao } from "@/server/db";

/**
 * Reserva paga que vale para esta placa agora: já pode chegar (antecedência configurável)
 * e a janela ainda não acabou. Pendente não vale: não foi paga.
 */
export async function buscarReservaParaEntrada(
  estacionamentoId: string,
  placa: string,
  op: Operacao,
  db: typeof prisma | Transacao = prisma,
) {
  return db.reserva.findFirst({
    where: {
      estacionamentoId,
      placa,
      status: "confirmada",
      inicioEm: { lte: new Date(op.agora.getTime() + op.reservas.chegadaAntecipadaMin * 60_000) },
      fimEm: { gt: op.agora },
    },
    orderBy: { inicioEm: "asc" },
    select: { id: true, codigo: true, vagaId: true, vaga: { select: { numero: true } } },
  });
}
