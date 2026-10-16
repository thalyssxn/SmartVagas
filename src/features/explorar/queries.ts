import { obterOperacao } from "@/features/configuracao/queries";
import { listarVagasDoMapa } from "@/features/vagas/queries";
import type { TipoVaga, TipoVeiculo } from "@/generated/prisma/enums";
import { contarPorVeiculo, lotacao, type Lotacao } from "@/lib/veiculo";
import { prisma } from "@/server/db";

export type EstacionamentoPublico = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string | null;
  telefone: string | null;
  horario: string | null;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  precos: {
    toleranciaMin: number;
    primeiraHoraCentavos: number;
    horaAdicionalCentavos: number;
    diariaCentavos: number;
  };
  total: number;
  livres: number;
  livresPorVeiculo: Record<TipoVeiculo, number>;
  totalPorVeiculo: Record<TipoVeiculo, number>;
  livresPorTipo: Partial<Record<TipoVaga, number>>;
  aceitaReserva: boolean;
  lotacao: Lotacao;
  coberto: boolean;
  proximoEvento: { id: string; nome: string; inicioEm: string } | null;
};

const selecaoBase = {
  id: true,
  nome: true,
  endereco: true,
  cidade: true,
  telefone: true,
  horario: true,
  descricao: true,
  latitude: true,
  longitude: true,
} as const;

async function montar(
  base: {
    id: string;
    nome: string;
    endereco: string;
    cidade: string | null;
    telefone: string | null;
    horario: string | null;
    descricao: string | null;
    latitude: number | null;
    longitude: number | null;
  },
  agora: Date,
): Promise<EstacionamentoPublico> {
  const op = await obterOperacao(base.id);
  const [vagas, proximoEvento] = await Promise.all([
    listarVagasDoMapa(base.id, op),
    prisma.evento.findFirst({
      where: { estacionamentoId: base.id, ativo: true, fimEm: { gt: agora } },
      orderBy: { inicioEm: "asc" },
      select: { id: true, nome: true, inicioEm: true },
    }),
  ]);

  const ativas = vagas.filter((v) => v.status !== "bloqueada");
  const livresPorTipo: Partial<Record<TipoVaga, number>> = {};
  const totalPorTipo: Partial<Record<TipoVaga, number>> = {};
  for (const vaga of ativas) {
    totalPorTipo[vaga.tipo] = (totalPorTipo[vaga.tipo] ?? 0) + 1;
    if (vaga.status === "livre") livresPorTipo[vaga.tipo] = (livresPorTipo[vaga.tipo] ?? 0) + 1;
  }
  const livres = ativas.filter((v) => v.status === "livre").length;

  return {
    ...base,
    precos: op.tabela,
    total: ativas.length,
    livres,
    livresPorVeiculo: contarPorVeiculo(livresPorTipo),
    totalPorVeiculo: contarPorVeiculo(totalPorTipo),
    livresPorTipo,
    aceitaReserva: ativas.some((v) => v.reservavel),
    lotacao: lotacao(livres, ativas.length),
    coberto: ativas.some((v) => v.coberta),
    proximoEvento: proximoEvento && {
      ...proximoEvento,
      inicioEm: proximoEvento.inicioEm.toISOString(),
    },
  };
}

/** Busca pública: todo estacionamento publicado, com a lotação de agora. */
export async function listarEstacionamentosPublicos(): Promise<EstacionamentoPublico[]> {
  const agora = new Date();
  const lista = await prisma.estacionamento.findMany({
    where: { publicado: true, configuracao: { isNot: null } },
    orderBy: { nome: "asc" },
    select: selecaoBase,
  });
  return Promise.all(lista.map((e) => montar(e, agora)));
}

export async function obterEstacionamentoPublico(
  id: string,
): Promise<EstacionamentoPublico | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const base = await prisma.estacionamento.findFirst({
    where: { id, publicado: true, configuracao: { isNot: null } },
    select: selecaoBase,
  });
  return base ? montar(base, new Date()) : null;
}

export async function listarCidades(): Promise<string[]> {
  const linhas = await prisma.estacionamento.findMany({
    where: { publicado: true, cidade: { not: null } },
    distinct: ["cidade"],
    select: { cidade: true },
    orderBy: { cidade: "asc" },
  });
  return linhas.map((l) => l.cidade!).filter(Boolean);
}
