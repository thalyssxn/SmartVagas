import { dataParaDia } from "@/lib/tempo";
import { prisma } from "@/server/db";
import { limitesDoMes } from "./periodo";
import { resumirMes, type Receitas } from "./regras";

/** Receitas do mês em regime de caixa: vale a data em que o dinheiro entrou (RN-08). */
async function receitasDoMes(estacionamentoId: string, inicio: Date, fim: Date): Promise<Receitas> {
  const periodo = { gte: inicio, lt: fim };
  const [avulso, mensalidades, reservas, reembolsos] = await Promise.all([
    prisma.estadia.aggregate({
      where: { estacionamentoId, saidaEm: periodo },
      _sum: { valorCentavos: true },
    }),
    prisma.pagamentoMensalidade.aggregate({
      where: { estacionamentoId, pagoEm: periodo },
      _sum: { valorCentavos: true },
    }),
    prisma.reserva.aggregate({
      where: { estacionamentoId, pagaEm: periodo },
      _sum: { valorCentavos: true },
    }),
    prisma.reserva.aggregate({
      where: { estacionamentoId, reembolsadaEm: periodo },
      _sum: { reembolsoCentavos: true },
    }),
  ]);
  return {
    avulsoCentavos: avulso._sum.valorCentavos ?? 0,
    mensalidadesCentavos: mensalidades._sum.valorCentavos ?? 0,
    reservasCentavos: reservas._sum.valorCentavos ?? 0,
    reembolsosCentavos: reembolsos._sum.reembolsoCentavos ?? 0,
  };
}

export async function listarCustosDoMes(estacionamentoId: string, competencia: string) {
  const custos = await prisma.custo.findMany({
    where: {
      estacionamentoId,
      data: { gte: new Date(`${competencia}-01T00:00:00Z`), lt: proximoMes(competencia) },
    },
    orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    select: { id: true, categoria: true, descricao: true, valorCentavos: true, data: true, funcionarioId: true },
  });
  return custos.map((c) => ({ ...c, data: dataParaDia(c.data) }));
}

function proximoMes(competencia: string): Date {
  const [ano, mes] = competencia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes, 1));
}

export async function resumoFinanceiro(estacionamentoId: string, competencia: string, fuso: string) {
  const { inicio, fim } = limitesDoMes(competencia, fuso);
  const [receitas, custos] = await Promise.all([
    receitasDoMes(estacionamentoId, inicio, fim),
    listarCustosDoMes(estacionamentoId, competencia),
  ]);
  const custoTotal = custos.reduce((soma, c) => soma + c.valorCentavos, 0);
  return { receitas, custos, ...resumirMes(receitas, custoTotal) };
}

export async function listarFuncionarios(estacionamentoId: string) {
  return prisma.funcionario.findMany({
    where: { estacionamentoId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, funcao: true, salarioCentavos: true, encargosCentavos: true, ativo: true },
  });
}
