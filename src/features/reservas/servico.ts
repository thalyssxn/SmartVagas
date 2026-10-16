import { z } from "zod";
import { notificar } from "@/features/avisos/servico";
import { obterOperacao, type Operacao } from "@/features/configuracao/queries";
import { calcularValorEstadia } from "@/features/estadias/preco";
import type { Prisma } from "@/generated/prisma/client";
import type { TipoVaga } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import { placaSchema } from "@/lib/placa";
import { ErroDeNegocio } from "@/lib/resultado";
import { formatarDataHora, lerHorarioLocal, minutosEntre } from "@/lib/tempo";
import { TIPOS_VAGA, vagaServeParaVeiculo } from "@/lib/veiculo";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma, type Transacao } from "@/server/db";
import { clienteNoEstacionamento, type Contexto, type ContextoCliente } from "@/server/sessao";
import { calcularCancelamento, gerarCodigo, validarJanela } from "./regras";

export const periodoSchema = z.object({
  estacionamentoId: z.uuid("Escolha o estacionamento."),
  inicio: z.string().min(1, "Informe o início."),
  fim: z.string().min(1, "Informe o fim."),
  tipo: z.enum(TIPOS_VAGA).default("comum"),
});

export const reservaSchema = periodoSchema.extend({
  placa: placaSchema,
  eventoId: z.uuid().optional(),
});

type Cliente = typeof prisma | Transacao;

/** Pendente vencida vira expirada na leitura: libera a vaga sem cron. */
export async function expirarPendentes(db: Cliente, estacionamentoId: string, agora: Date) {
  await db.reserva.updateMany({
    where: { estacionamentoId, status: "pendente", expiraEm: { lt: agora } },
    data: { status: "expirada" },
  });
}

/** Reserva que ainda segura a vaga: confirmada, em uso, ou pendente dentro do prazo do Pix. */
export function reservaAtiva(agora: Date): Prisma.ReservaWhereInput {
  return {
    OR: [
      { status: { in: ["confirmada", "em_uso"] } },
      { status: "pendente", expiraEm: { gt: agora } },
    ],
  };
}

function lerPeriodo(entrada: z.input<typeof periodoSchema>, op: Operacao) {
  const dados = periodoSchema.parse(entrada);
  const inicio = lerHorarioLocal(dados.inicio, op.fuso);
  const fim = lerHorarioLocal(dados.fim, op.fuso);
  if (!inicio || !fim) throw new ErroDeNegocio("periodo_invalido", "Data ou hora inválida.");
  const erro = validarJanela(inicio, fim, op.agora, op.reservas);
  if (erro) throw new ErroDeNegocio("periodo_invalido", erro);
  return { inicio, fim, tipo: dados.tipo };
}

/** RN-07: só vaga ativa e reservável, sem dono fixo, sem reserva sobreposta e sem carro dentro. */
export async function vagasLivresNoPeriodo(
  db: Cliente,
  estacionamentoId: string,
  inicio: Date,
  fim: Date,
  tipo: TipoVaga | undefined,
  op: Operacao,
) {
  // Carro avulso dentro não tem hora de saída: perto de agora, a vaga dele não é prometida (RN-10).
  const avulsoPodeEstarDentro =
    inicio.getTime() < op.agora.getTime() + op.reservas.bloqueioAvulsoH * 3_600_000;

  return db.vaga.findMany({
    where: {
      estacionamentoId,
      ativa: true,
      reservavel: true,
      ...(tipo && { tipo }),
      assinaturasFixas: { none: { encerradaEm: null } },
      reservas: {
        none: { inicioEm: { lt: fim }, fimEm: { gt: inicio }, ...reservaAtiva(op.agora) },
      },
      ...(avulsoPodeEstarDentro && { estadias: { none: { saidaEm: null } } }),
    },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, tipo: true },
  });
}

export type Disponibilidade = { tipo: TipoVaga; disponiveis: number; valorCentavos: number };

async function estacionamentoPublico(estacionamentoId: string) {
  const estacionamento = await prisma.estacionamento.findFirst({
    where: { id: estacionamentoId, publicado: true },
    select: { id: true, nome: true },
  });
  if (!estacionamento) {
    throw new ErroDeNegocio(
      "estacionamento_inexistente",
      "Esse estacionamento não está recebendo reservas.",
    );
  }
  return estacionamento;
}

export async function buscarDisponibilidade(
  entrada: z.input<typeof periodoSchema>,
): Promise<Disponibilidade[]> {
  const { estacionamentoId } = periodoSchema.parse(entrada);
  await estacionamentoPublico(estacionamentoId);
  const op = await obterOperacao(estacionamentoId);
  const { inicio, fim } = lerPeriodo(entrada, op);
  await expirarPendentes(prisma, estacionamentoId, op.agora);

  const vagas = await vagasLivresNoPeriodo(prisma, estacionamentoId, inicio, fim, undefined, op);
  const valorCentavos = calcularValorEstadia(minutosEntre(inicio, fim), op.tabela);
  const contagem = new Map<TipoVaga, number>();
  for (const vaga of vagas) contagem.set(vaga.tipo, (contagem.get(vaga.tipo) ?? 0) + 1);

  // Comum primeiro; as especiais (PCD, idoso) por último.
  return [...contagem]
    .sort(([a], [b]) => TIPOS_VAGA.indexOf(a) - TIPOS_VAGA.indexOf(b))
    .map(([tipo, disponiveis]) => ({ tipo, disponiveis, valorCentavos }));
}

export async function criarReserva(
  cliente: ContextoCliente,
  entrada: z.input<typeof reservaSchema>,
) {
  const { placa, eventoId, ...periodo } = reservaSchema.parse(entrada);
  const { estacionamentoId } = periodo;
  await estacionamentoPublico(estacionamentoId);
  const op = await obterOperacao(estacionamentoId);
  const { inicio, fim, tipo } = lerPeriodo(periodo, op);

  // V2: o veículo é do login, não de um estacionamento.
  const veiculo = await prisma.veiculo.findFirst({
    where: { placa, motorista: { userId: cliente.usuarioId } },
    select: { tipo: true },
  });
  if (!veiculo) throw new ErroDeNegocio("veiculo_invalido", "Esse veículo não está na sua conta.");
  const direitoEspecial = veiculo.tipo === "carro" && (tipo === "pcd" || tipo === "idoso");
  if (!direitoEspecial && !vagaServeParaVeiculo(tipo, veiculo.tipo)) {
    throw new ErroDeNegocio("tipo_incompativel", "Esse tipo de vaga não serve para o seu veículo.");
  }

  if (eventoId) {
    const evento = await prisma.evento.count({
      where: { id: eventoId, estacionamentoId, ativo: true },
    });
    if (!evento)
      throw new ErroDeNegocio("evento_invalido", "Esse evento não é deste estacionamento.");
  }

  await prisma.reserva.updateMany({
    where: {
      motorista: { userId: cliente.usuarioId },
      status: "pendente",
      expiraEm: { lt: op.agora },
    },
    data: { status: "expirada" },
  });
  const pendente = await prisma.reserva.findFirst({
    where: { motorista: { userId: cliente.usuarioId }, status: "pendente" },
    select: { codigo: true },
  });
  if (pendente) {
    throw new ErroDeNegocio(
      "pendente_existente",
      `Você já tem a reserva ${pendente.codigo} aguardando pagamento. Pague ou cancele antes de reservar outra.`,
    );
  }

  const contexto = await clienteNoEstacionamento(cliente, estacionamentoId);
  const valorCentavos = calcularValorEstadia(minutosEntre(inicio, fim), op.tabela);
  const expiraEm = new Date(op.agora.getTime() + op.reservas.expiracaoPendenteMin * 60_000);
  await expirarPendentes(prisma, estacionamentoId, op.agora);

  return prisma.$transaction(async (tx) => {
    const candidatas = await vagasLivresNoPeriodo(tx, estacionamentoId, inicio, fim, tipo, op);
    for (const vaga of candidatas) {
      // Lock na vaga: duas reservas simultâneas na mesma vaga se enfileiram aqui (RF-14).
      await tx.$queryRaw`SELECT id FROM vagas WHERE id = ${vaga.id}::uuid FOR UPDATE`;
      const choque = await tx.reserva.count({
        where: {
          vagaId: vaga.id,
          inicioEm: { lt: fim },
          fimEm: { gt: inicio },
          ...reservaAtiva(op.agora),
        },
      });
      if (choque > 0) continue;

      const reserva = await tx.reserva.create({
        data: {
          estacionamentoId,
          vagaId: vaga.id,
          motoristaId: contexto.motoristaId,
          placa,
          codigo: gerarCodigo(),
          inicioEm: inicio,
          fimEm: fim,
          valorCentavos,
          expiraEm,
          eventoId: eventoId ?? null,
        },
        select: { id: true, codigo: true },
      });
      await registrarAuditoria(tx, contexto, {
        acao: "reserva.criada",
        entidade: "reserva",
        entidadeId: reserva.id,
        dados: { vaga: vaga.numero, placa, valorCentavos },
      });
      return reserva;
    }
    throw new ErroDeNegocio("sem_vaga", "Esgotou: acabaram as vagas desse tipo nesse horário.");
  });
}

export async function confirmarPagamento(contexto: Contexto, reservaId: string) {
  const agora = new Date();
  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findFirst({
      where: { id: reservaId, estacionamentoId: contexto.estacionamentoId },
      select: {
        status: true,
        expiraEm: true,
        codigo: true,
        valorCentavos: true,
        inicioEm: true,
        motorista: { select: { userId: true } },
        vaga: { select: { numero: true } },
      },
    });
    if (!reserva) throw new ErroDeNegocio("reserva_inexistente", "Reserva não encontrada.");
    if (reserva.status !== "pendente") {
      throw new ErroDeNegocio("status_invalido", "Essa reserva não está aguardando pagamento.");
    }
    // Pendente vencida pode ter perdido a vaga para outro motorista: não dá para confirmar.
    if (reserva.expiraEm < agora) {
      await tx.reserva.update({ where: { id: reservaId }, data: { status: "expirada" } });
      throw new ErroDeNegocio(
        "reserva_expirada",
        "Essa reserva expirou. O motorista precisa reservar de novo.",
      );
    }
    await tx.reserva.update({
      where: { id: reservaId },
      data: { status: "confirmada", pagaEm: agora, confirmadaPorId: contexto.usuarioId },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "reserva.pagamento_confirmado",
      entidade: "reserva",
      entidadeId: reservaId,
      dados: { codigo: reserva.codigo, valorCentavos: reserva.valorCentavos },
    });
    const { fuso } = await obterOperacao(contexto.estacionamentoId);
    await notificar(tx, reserva.motorista.userId, {
      tipo: "reserva_confirmada",
      titulo: "Vaga garantida",
      mensagem: `Pagamento da reserva ${reserva.codigo} confirmado. Vaga ${reserva.vaga.numero}, chegada a partir de ${formatarDataHora(reserva.inicioEm, fuso)}.`,
      link: `/cliente/reservas#${reservaId}`,
    });
    return { codigo: reserva.codigo };
  });
}

async function cancelar(contexto: Contexto, reservaId: string, porCliente: boolean) {
  const op = await obterOperacao(contexto.estacionamentoId);

  return prisma.$transaction(async (tx) => {
    const reserva = await tx.reserva.findFirst({
      where: { id: reservaId, estacionamentoId: contexto.estacionamentoId },
      select: {
        status: true,
        inicioEm: true,
        valorCentavos: true,
        codigo: true,
        motorista: { select: { userId: true } },
      },
    });
    if (!reserva) throw new ErroDeNegocio("reserva_inexistente", "Reserva não encontrada.");
    if (reserva.status !== "pendente" && reserva.status !== "confirmada") {
      throw new ErroDeNegocio("status_invalido", "Essa reserva não pode mais ser cancelada.");
    }

    const paga = reserva.status === "confirmada";
    const cancelamento = calcularCancelamento(
      paga,
      reserva.valorCentavos,
      reserva.inicioEm,
      op.agora,
      op.reservas,
    );
    await tx.reserva.update({
      where: { id: reservaId },
      data: {
        status: "cancelada",
        canceladaEm: op.agora,
        reembolsoCentavos: cancelamento.reembolsoCentavos,
      },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "reserva.cancelada",
      entidade: "reserva",
      entidadeId: reservaId,
      dados: { codigo: reserva.codigo, paga, porCliente, ...cancelamento },
    });
    if (!porCliente) {
      await notificar(tx, reserva.motorista.userId, {
        tipo: "reserva_cancelada",
        titulo: "Reserva cancelada pelo estacionamento",
        mensagem:
          cancelamento.reembolsoCentavos > 0
            ? `A reserva ${reserva.codigo} foi cancelada. Você recebe ${formatarCentavos(cancelamento.reembolsoCentavos)} de volta.`
            : `A reserva ${reserva.codigo} foi cancelada.`,
        link: `/cliente/reservas#${reservaId}`,
      });
    }
    return { codigo: reserva.codigo, paga, ...cancelamento };
  });
}

/** Equipe cancela qualquer reserva do próprio estacionamento. */
export async function cancelarReserva(contexto: Contexto, reservaId: string) {
  return cancelar(contexto, reservaId, false);
}

/** Motorista cancela só as próprias, em qualquer estacionamento. */
export async function cancelarReservaDoCliente(cliente: ContextoCliente, reservaId: string) {
  const reserva = await prisma.reserva.findFirst({
    where: { id: reservaId, motorista: { userId: cliente.usuarioId } },
    select: { estacionamentoId: true },
  });
  if (!reserva) throw new ErroDeNegocio("reserva_inexistente", "Reserva não encontrada.");
  const contexto = await clienteNoEstacionamento(cliente, reserva.estacionamentoId);
  return cancelar(contexto, reservaId, true);
}

export async function marcarReembolsada(contexto: Contexto, reservaId: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.reserva.updateMany({
      where: {
        id: reservaId,
        estacionamentoId: contexto.estacionamentoId,
        status: "cancelada",
        reembolsoCentavos: { gt: 0 },
        reembolsadaEm: null,
      },
      data: { reembolsadaEm: new Date() },
    });
    if (count === 0) {
      throw new ErroDeNegocio("sem_reembolso", "Não há reembolso pendente nessa reserva.");
    }
    await registrarAuditoria(tx, contexto, {
      acao: "reserva.reembolsada",
      entidade: "reserva",
      entidadeId: reservaId,
    });
  });
}
