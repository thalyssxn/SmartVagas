import { obterOperacao } from "@/features/configuracao/queries";
import { vagasLivresNoPeriodo } from "@/features/reservas/servico";
import { prisma } from "@/server/db";

export type EventoPublico = {
  id: string;
  nome: string;
  descricao: string | null;
  local: string;
  categoria: string | null;
  inicioEm: string;
  fimEm: string;
  /** Vagas reserváveis ainda livres na janela do evento (com folga de 30 min antes). */
  vagasParaReserva: number;
  estacionamento: {
    id: string;
    nome: string;
    endereco: string;
    cidade: string | null;
    latitude: number | null;
    longitude: number | null;
  };
};

const FOLGA_CHEGADA_MS = 30 * 60_000;

/** Agenda pública: eventos que ainda não acabaram, em estacionamentos publicados. */
export async function listarEventosPublicos(
  filtro: { estacionamentoId?: string } = {},
): Promise<EventoPublico[]> {
  const agora = new Date();
  const eventos = await prisma.evento.findMany({
    where: {
      ativo: true,
      fimEm: { gt: agora },
      estacionamento: { publicado: true },
      ...(filtro.estacionamentoId && { estacionamentoId: filtro.estacionamentoId }),
    },
    orderBy: { inicioEm: "asc" },
    take: 60,
    select: {
      id: true,
      nome: true,
      descricao: true,
      local: true,
      categoria: true,
      inicioEm: true,
      fimEm: true,
      estacionamento: {
        select: {
          id: true,
          nome: true,
          endereco: true,
          cidade: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  const operacoes = new Map<string, Awaited<ReturnType<typeof obterOperacao>>>();
  return Promise.all(
    eventos.map(async (evento) => {
      const estId = evento.estacionamento.id;
      if (!operacoes.has(estId)) operacoes.set(estId, await obterOperacao(estId));
      const op = operacoes.get(estId)!;
      const inicio = new Date(
        Math.max(evento.inicioEm.getTime() - FOLGA_CHEGADA_MS, agora.getTime()),
      );
      const vagas = await vagasLivresNoPeriodo(prisma, estId, inicio, evento.fimEm, undefined, op);
      return {
        ...evento,
        inicioEm: evento.inicioEm.toISOString(),
        fimEm: evento.fimEm.toISOString(),
        vagasParaReserva: vagas.length,
      };
    }),
  );
}

export async function obterEventoParaReserva(eventoId: string, estacionamentoId: string) {
  return prisma.evento.findFirst({
    where: { id: eventoId, estacionamentoId, ativo: true },
    select: { id: true, nome: true, local: true, inicioEm: true, fimEm: true },
  });
}

/** Painel do dono: todos os eventos do estacionamento, próximos primeiro. */
export async function listarEventosDoEstacionamento(estacionamentoId: string) {
  const agora = new Date();
  const [proximos, passados] = await Promise.all([
    prisma.evento.findMany({
      where: { estacionamentoId, fimEm: { gt: agora } },
      orderBy: { inicioEm: "asc" },
      select: {
        id: true,
        nome: true,
        descricao: true,
        local: true,
        categoria: true,
        inicioEm: true,
        fimEm: true,
        ativo: true,
        _count: {
          select: {
            reservas: { where: { status: { in: ["confirmada", "em_uso", "concluida"] } } },
          },
        },
      },
    }),
    prisma.evento.findMany({
      where: { estacionamentoId, fimEm: { lte: agora } },
      orderBy: { inicioEm: "desc" },
      take: 10,
      select: {
        id: true,
        nome: true,
        local: true,
        inicioEm: true,
        fimEm: true,
        _count: {
          select: {
            reservas: { where: { status: { in: ["confirmada", "em_uso", "concluida"] } } },
          },
        },
      },
    }),
  ]);
  return { proximos, passados };
}
