import { z } from "zod";
import { reaisSchema } from "@/lib/dinheiro";
import { ErroDeNegocio } from "@/lib/resultado";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma, type Transacao } from "@/server/db";
import type { Contexto } from "@/server/sessao";
import { diferencaDeCaixa, esperadoNaGaveta, type RecebimentosDoTurno } from "./regras";

export const abrirTurnoSchema = z.object({ troco: reaisSchema });
export const fecharTurnoSchema = z.object({
  contado: reaisSchema,
  observacao: z.string().trim().max(200, "Observação muito longa.").optional(),
});

type Cliente = typeof prisma | Transacao;

/** Tudo que entrou no turno, por forma de pagamento: estadias pagas na saída + mensalidades. */
export async function recebimentosDoTurno(db: Cliente, turnoId: string): Promise<RecebimentosDoTurno> {
  const [estadias, mensalidades] = await Promise.all([
    db.estadia.groupBy({
      by: ["formaPagamento"],
      where: { turnoId, valorCentavos: { gt: 0 } },
      _sum: { valorCentavos: true },
    }),
    db.pagamentoMensalidade.groupBy({
      by: ["formaPagamento"],
      where: { turnoId },
      _sum: { valorCentavos: true },
    }),
  ]);

  const total = { dinheiroCentavos: 0, pixCentavos: 0, cartaoCentavos: 0 };
  for (const linha of [...estadias, ...mensalidades]) {
    const valor = linha._sum.valorCentavos ?? 0;
    if (linha.formaPagamento === "dinheiro") total.dinheiroCentavos += valor;
    else if (linha.formaPagamento === "pix") total.pixCentavos += valor;
    else if (linha.formaPagamento === "cartao") total.cartaoCentavos += valor;
  }
  return total;
}

export async function abrirTurno(contexto: Contexto, entrada: z.input<typeof abrirTurnoSchema>) {
  const { troco } = abrirTurnoSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const aberto = await tx.turno.findFirst({
      where: { operadorId: contexto.usuarioId, fechadoEm: null },
      select: { id: true },
    });
    if (aberto) throw new ErroDeNegocio("turno_aberto", "Você já tem um caixa aberto.");

    const turno = await tx.turno.create({
      data: {
        estacionamentoId: contexto.estacionamentoId,
        operadorId: contexto.usuarioId,
        trocoInicialCentavos: troco,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "caixa.aberto",
      entidade: "turno",
      entidadeId: turno.id,
      dados: { trocoCentavos: troco },
    });
    return turno;
  });
}

export async function fecharTurno(contexto: Contexto, entrada: z.input<typeof fecharTurnoSchema>) {
  const { contado, observacao } = fecharTurnoSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const turno = await tx.turno.findFirst({
      where: { operadorId: contexto.usuarioId, fechadoEm: null },
      select: { id: true, trocoInicialCentavos: true },
    });
    if (!turno) throw new ErroDeNegocio("sem_turno", "Você não tem caixa aberto.");

    const recebimentos = await recebimentosDoTurno(tx, turno.id);
    const esperado = esperadoNaGaveta(turno.trocoInicialCentavos, recebimentos);
    const diferenca = diferencaDeCaixa(contado, esperado);

    await tx.turno.update({
      where: { id: turno.id },
      data: {
        fechadoEm: new Date(),
        contadoCentavos: contado,
        esperadoCentavos: esperado,
        observacao: observacao || null,
      },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "caixa.fechado",
      entidade: "turno",
      entidadeId: turno.id,
      dados: { contadoCentavos: contado, esperadoCentavos: esperado, diferencaCentavos: diferenca },
    });
    return { esperadoCentavos: esperado, contadoCentavos: contado, diferencaCentavos: diferenca };
  });
}
