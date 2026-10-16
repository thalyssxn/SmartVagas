import type { PlanoAplicado } from "@/features/estadias/cobranca";
import type { Operacao } from "@/features/configuracao/queries";
import type { Prisma } from "@/generated/prisma/client";
import { dataParaDia } from "@/lib/tempo";
import { prisma } from "@/server/db";
import { statusAssinatura, type StatusAssinatura } from "./status-assinatura";

export type MensalistaResumo = {
  assinaturaId: string;
  nome: string;
  plano: PlanoAplicado;
  vagaFixaId: string | null;
  venceEm: string;
  status: StatusAssinatura;
};

type PlanoDoBanco = Pick<
  Prisma.PlanoGetPayload<object>,
  "nome" | "diasSemana" | "inicioMin" | "fimMin"
>;

export function paraPlanoAplicado(plano: PlanoDoBanco): PlanoAplicado {
  return {
    nome: plano.nome,
    janela: { diasSemana: plano.diasSemana, inicioMin: plano.inicioMin, fimMin: plano.fimMin },
  };
}

const selecao = {
  id: true,
  vagaFixaId: true,
  venceEm: true,
  motorista: { select: { nome: true } },
  plano: { select: { nome: true, diasSemana: true, inicioMin: true, fimMin: true } },
} satisfies Prisma.AssinaturaSelect;

type AssinaturaSelecionada = Prisma.AssinaturaGetPayload<{ select: typeof selecao }>;

function resumir(assinatura: AssinaturaSelecionada, op: Operacao): MensalistaResumo {
  const venceEm = dataParaDia(assinatura.venceEm);
  return {
    assinaturaId: assinatura.id,
    nome: assinatura.motorista.nome,
    plano: paraPlanoAplicado(assinatura.plano),
    vagaFixaId: assinatura.vagaFixaId,
    venceEm,
    status: statusAssinatura(venceEm, op.hoje, op.carenciaDias),
  };
}

export async function buscarMensalistaPorPlaca(
  estacionamentoId: string,
  placa: string,
  op: Operacao,
): Promise<MensalistaResumo | null> {
  const assinatura = await prisma.assinatura.findFirst({
    where: {
      encerradaEm: null,
      motorista: { estacionamentoId, veiculos: { some: { placa } } },
    },
    orderBy: { venceEm: "desc" },
    select: selecao,
  });
  return assinatura ? resumir(assinatura, op) : null;
}

export async function listarAssinaturasAtivas(
  estacionamentoId: string,
  op: Operacao,
): Promise<MensalistaResumo[]> {
  const assinaturas = await prisma.assinatura.findMany({
    where: { encerradaEm: null, motorista: { estacionamentoId } },
    orderBy: { venceEm: "asc" },
    select: selecao,
  });
  return assinaturas.map((assinatura) => resumir(assinatura, op));
}
