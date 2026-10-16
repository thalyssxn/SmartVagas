import { limitesDoMes } from "@/features/financeiro/periodo";
import { dataParaDia } from "@/lib/tempo";
import { prisma } from "@/server/db";

/** Convênios com o uso do mês: quantas saídas e quanto o parceiro deve (soma dos descontos). */
export async function listarConvenios(estacionamentoId: string, competencia: string, fuso: string) {
  const { inicio, fim } = limitesDoMes(competencia, fuso);
  const [convenios, uso] = await Promise.all([
    prisma.convenio.findMany({
      where: { estacionamentoId },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        tipo: true,
        contato: true,
        telefone: true,
        tipoDesconto: true,
        valorDesconto: true,
        validoAte: true,
        ativo: true,
        observacao: true,
      },
    }),
    prisma.estadia.groupBy({
      by: ["convenioId"],
      where: { estacionamentoId, convenioId: { not: null }, saidaEm: { gte: inicio, lt: fim } },
      _count: { _all: true },
      _sum: { descontoCentavos: true, valorCentavos: true },
    }),
  ]);
  const porConvenio = new Map(uso.map((u) => [u.convenioId, u]));
  return convenios.map((c) => {
    const u = porConvenio.get(c.id);
    return {
      ...c,
      validoAte: c.validoAte ? dataParaDia(c.validoAte) : null,
      usos: u?._count._all ?? 0,
      aFaturarCentavos: u?._sum.descontoCentavos ?? 0,
      pagoPeloClienteCentavos: u?._sum.valorCentavos ?? 0,
    };
  });
}

export type ConvenioListado = Awaited<ReturnType<typeof listarConvenios>>[number];
