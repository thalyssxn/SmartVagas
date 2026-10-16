import type { Operacao } from "@/features/configuracao/queries";
import type { TabelaPreco } from "@/features/estadias/preco";
import { prisma } from "@/server/db";
import { calcularCancelamento } from "./regras";
import { expirarPendentes } from "./servico";
import { paraTela, type ReservaParaTela } from "./status-reserva";

const selecao = {
  id: true,
  codigo: true,
  placa: true,
  status: true,
  inicioEm: true,
  fimEm: true,
  valorCentavos: true,
  expiraEm: true,
  reembolsoCentavos: true,
  reembolsadaEm: true,
  vaga: { select: { numero: true, tipo: true } },
  motorista: { select: { nome: true } },
  evento: { select: { nome: true } },
} as const;

export type ReservaDoCliente = ReservaParaTela & {
  estacionamento: { id: string; nome: string; endereco: string };
  chavePix: string | null;
  cancelamentoGratis: boolean;
  tabela: TabelaPreco;
};

/** V2: todas as reservas do login, em qualquer estacionamento. */
export async function listarReservasDoCliente(usuarioId: string): Promise<ReservaDoCliente[]> {
  const agora = new Date();
  await prisma.reserva.updateMany({
    where: { motorista: { userId: usuarioId }, status: "pendente", expiraEm: { lt: agora } },
    data: { status: "expirada" },
  });
  const reservas = await prisma.reserva.findMany({
    where: { motorista: { userId: usuarioId } },
    orderBy: { inicioEm: "desc" },
    take: 40,
    select: {
      ...selecao,
      estacionamento: {
        select: {
          id: true,
          nome: true,
          endereco: true,
          configuracao: {
            select: {
              chavePix: true,
              cancelamentoPrazoH: true,
              retencaoPct: true,
              antecedenciaMinMin: true,
              antecedenciaMaxDias: true,
              duracaoMaxH: true,
              toleranciaMin: true,
              primeiraHoraCentavos: true,
              horaAdicionalCentavos: true,
              diariaCentavos: true,
            },
          },
        },
      },
    },
  });

  return reservas.map((reserva) => {
    const c = reserva.estacionamento.configuracao!;
    return {
      ...paraTela(reserva),
      estacionamento: {
        id: reserva.estacionamento.id,
        nome: reserva.estacionamento.nome,
        endereco: reserva.estacionamento.endereco,
      },
      chavePix: c.chavePix,
      cancelamentoGratis: calcularCancelamento(
        reserva.status === "confirmada",
        reserva.valorCentavos,
        reserva.inicioEm,
        agora,
        c,
      ).noPrazo,
      tabela: {
        toleranciaMin: c.toleranciaMin,
        primeiraHoraCentavos: c.primeiraHoraCentavos,
        horaAdicionalCentavos: c.horaAdicionalCentavos,
        diariaCentavos: c.diariaCentavos,
      },
    };
  });
}

/** Tela do guichê: o que exige ação (pagamento a confirmar, reembolso a fazer) e o que vem aí. */
export async function listarReservasDoGuiche(estacionamentoId: string, op: Operacao) {
  await expirarPendentes(prisma, estacionamentoId, op.agora);

  const [aguardando, proximas, reembolsos] = await Promise.all([
    prisma.reserva.findMany({
      where: { estacionamentoId, status: "pendente" },
      orderBy: { expiraEm: "asc" },
      select: selecao,
    }),
    prisma.reserva.findMany({
      where: {
        estacionamentoId,
        status: { in: ["confirmada", "em_uso"] },
        fimEm: { gt: op.agora },
      },
      orderBy: { inicioEm: "asc" },
      select: selecao,
    }),
    prisma.reserva.findMany({
      where: {
        estacionamentoId,
        status: "cancelada",
        reembolsoCentavos: { gt: 0 },
        reembolsadaEm: null,
      },
      orderBy: { canceladaEm: "asc" },
      select: selecao,
    }),
  ]);
  return { aguardando, proximas, reembolsos };
}
