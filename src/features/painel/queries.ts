import type { Operacao } from "@/features/configuracao/queries";
import { listarDentro } from "@/features/estadias/queries";
import { listarAssinaturasAtivas } from "@/features/mensalistas/queries";
import { listarVagasDoMapa } from "@/features/vagas/queries";
import type { StatusVaga } from "@/features/vagas/status-vaga";
import type { FormaPagamento } from "@/generated/prisma/enums";
import { inicioDoDia } from "@/lib/tempo";
import { agruparPor } from "@/lib/utils";
import { prisma } from "@/server/db";

/** RF-07: o que o dono quer ver em uma tela. */
export async function resumoDoDia(estacionamentoId: string, op: Operacao) {
  const inicio = inicioDoDia(op.agora, op.fuso);

  const [vagas, entradas, saidas, receitaPorForma, mensalidades, dentro, assinaturas] =
    await Promise.all([
      listarVagasDoMapa(estacionamentoId, op),
      prisma.estadia.count({ where: { estacionamentoId, entradaEm: { gte: inicio } } }),
      prisma.estadia.count({ where: { estacionamentoId, saidaEm: { gte: inicio } } }),
      prisma.estadia.groupBy({
        by: ["formaPagamento"],
        where: { estacionamentoId, saidaEm: { gte: inicio }, valorCentavos: { gt: 0 } },
        _sum: { valorCentavos: true },
      }),
      prisma.pagamentoMensalidade.aggregate({
        where: { estacionamentoId, pagoEm: { gte: inicio } },
        _sum: { valorCentavos: true },
      }),
      listarDentro(estacionamentoId, op),
      listarAssinaturasAtivas(estacionamentoId, op),
    ]);

  const porStatus = agruparPor(vagas, (vaga) => vaga.status);
  const quantas = (status: StatusVaga) => porStatus.get(status)?.length ?? 0;

  const porForma: Record<FormaPagamento, number> = { dinheiro: 0, pix: 0, cartao: 0 };
  for (const linha of receitaPorForma) {
    if (linha.formaPagamento) porForma[linha.formaPagamento] = linha._sum.valorCentavos ?? 0;
  }

  return {
    vagas: {
      total: vagas.length,
      ativas: vagas.length - quantas("bloqueada"),
      livres: quantas("livre"),
      ocupadas: quantas("ocupada"),
      reservadas: quantas("reservada"),
    },
    entradas,
    saidas,
    receitaAvulsa: {
      totalCentavos: porForma.dinheiro + porForma.pix + porForma.cartao,
      porForma,
    },
    mensalidadesCentavos: mensalidades._sum.valorCentavos ?? 0,
    permanenciaLonga: dentro.filter((carro) => carro.alerta),
    mensalistasPendentes: assinaturas.filter((assinatura) => assinatura.status !== "em_dia"),
  };
}
