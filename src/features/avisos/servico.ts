import { prisma, type Transacao } from "@/server/db";
import { ErroDeNegocio } from "@/lib/resultado";
import type { ContextoCliente } from "@/server/sessao";

type Cliente = typeof prisma | Transacao;

export type NovoAviso = { tipo: string; titulo: string; mensagem: string; link?: string };

export async function notificar(db: Cliente, userId: string | null | undefined, aviso: NovoAviso) {
  if (!userId) return;
  await db.notificacao.create({ data: { userId, ...aviso, link: aviso.link ?? null } });
}

/**
 * Esgotamento (V2): quem pediu "avise-me" num estacionamento lotado recebe o aviso
 * na primeira saída. Roda dentro da transação da saída.
 */
export async function avisarVagaLiberada(tx: Transacao, estacionamentoId: string, agora: Date) {
  const alertas = await tx.alertaVaga.findMany({
    where: { estacionamentoId, notificadoEm: null },
    select: { id: true, userId: true },
  });
  if (alertas.length === 0) return 0;
  const { nome } = await tx.estacionamento.findUniqueOrThrow({
    where: { id: estacionamentoId },
    select: { nome: true },
  });
  await tx.notificacao.createMany({
    data: alertas.map((alerta) => ({
      userId: alerta.userId,
      tipo: "vaga_liberada",
      titulo: "Abriu vaga!",
      mensagem: `${nome} acabou de liberar uma vaga. Corra para garantir.`,
      link: `/estacionamentos/${estacionamentoId}`,
    })),
  });
  await tx.alertaVaga.updateMany({
    where: { id: { in: alertas.map((a) => a.id) } },
    data: { notificadoEm: agora },
  });
  return alertas.length;
}

export async function criarAlertaVaga(cliente: ContextoCliente, estacionamentoId: string) {
  const estacionamento = await prisma.estacionamento.findFirst({
    where: { id: estacionamentoId, publicado: true },
    select: { nome: true },
  });
  if (!estacionamento)
    throw new ErroDeNegocio("estacionamento_inexistente", "Estacionamento não encontrado.");

  const existente = await prisma.alertaVaga.findFirst({
    where: { userId: cliente.usuarioId, estacionamentoId, notificadoEm: null },
    select: { id: true },
  });
  if (!existente) {
    await prisma.alertaVaga.create({ data: { userId: cliente.usuarioId, estacionamentoId } });
  }
  return { nome: estacionamento.nome };
}

export async function listarAvisos(userId: string) {
  return prisma.notificacao.findMany({
    where: { userId },
    orderBy: { criadaEm: "desc" },
    take: 50,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      mensagem: true,
      link: true,
      lidaEm: true,
      criadaEm: true,
    },
  });
}

export async function contarAvisosNaoLidos(userId: string) {
  return prisma.notificacao.count({ where: { userId, lidaEm: null } });
}

export async function marcarAvisosLidos(userId: string) {
  await prisma.notificacao.updateMany({
    where: { userId, lidaEm: null },
    data: { lidaEm: new Date() },
  });
}

export async function alertasPendentes(userId: string) {
  return prisma.alertaVaga.findMany({
    where: { userId, notificadoEm: null },
    select: { id: true, criadoEm: true, estacionamento: { select: { id: true, nome: true } } },
  });
}

export async function cancelarAlertaVaga(cliente: ContextoCliente, alertaId: string) {
  await prisma.alertaVaga.deleteMany({
    where: { id: alertaId, userId: cliente.usuarioId, notificadoEm: null },
  });
}

const AVISO_ANTES_MIN = 20;

/**
 * Sem cron: ao abrir o portal, reserva em uso perto do fim (ou já passada) vira aviso,
 * uma vez por reserva. O texto lembra da taxa adicional.
 */
export async function gerarAvisosDeTempo(userId: string, agora: Date) {
  const reservas = await prisma.reserva.findMany({
    where: {
      motorista: { userId },
      status: { in: ["em_uso", "confirmada"] },
      fimEm: {
        lt: new Date(agora.getTime() + AVISO_ANTES_MIN * 60_000),
        gt: new Date(agora.getTime() - 6 * 3_600_000),
      },
    },
    select: { id: true, codigo: true, fimEm: true, estacionamento: { select: { nome: true } } },
  });
  for (const reserva of reservas) {
    const link = `/cliente/reservas#${reserva.id}`;
    const jaAvisou = await prisma.notificacao.count({
      where: { userId, tipo: "tempo_acabando", link },
    });
    if (jaAvisou > 0) continue;
    const passou = reserva.fimEm <= agora;
    await notificar(prisma, userId, {
      tipo: "tempo_acabando",
      titulo: passou ? "Seu horário terminou" : "Seu horário está acabando",
      mensagem: passou
        ? `A reserva ${reserva.codigo} em ${reserva.estacionamento.nome} passou do horário de saída. O tempo extra é cobrado como taxa adicional na saída.`
        : `A reserva ${reserva.codigo} em ${reserva.estacionamento.nome} termina em menos de ${AVISO_ANTES_MIN} min. Depois disso há taxa adicional.`,
      link,
    });
  }
}
