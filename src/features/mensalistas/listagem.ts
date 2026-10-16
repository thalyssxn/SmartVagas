import type { Operacao } from "@/features/configuracao/queries";
import { dataParaDia } from "@/lib/tempo";
import { prisma } from "@/server/db";
import { statusAssinatura, type StatusAssinatura } from "./status-assinatura";

export type MensalistaNaLista = {
  assinaturaId: string;
  nome: string;
  contato: string | null;
  placas: string[];
  plano: string;
  valorCentavos: number;
  vagaFixa: string | null;
  venceEm: string;
  status: StatusAssinatura;
};

const ORDEM: Record<StatusAssinatura, number> = { suspensa: 0, atrasada: 1, em_dia: 2 };

/** Quem precisa de atenção vem primeiro: suspensos, depois atrasados, depois em dia por vencimento. */
export async function listarMensalistas(
  estacionamentoId: string,
  op: Operacao,
): Promise<MensalistaNaLista[]> {
  const assinaturas = await prisma.assinatura.findMany({
    where: { encerradaEm: null, motorista: { estacionamentoId } },
    select: {
      id: true,
      venceEm: true,
      motorista: { select: { nome: true, telefone: true, email: true, veiculos: { select: { placa: true } } } },
      plano: { select: { nome: true, valorCentavos: true } },
      vagaFixa: { select: { numero: true } },
    },
  });

  return assinaturas
    .map((a) => {
      const venceEm = dataParaDia(a.venceEm);
      return {
        assinaturaId: a.id,
        nome: a.motorista.nome,
        contato: a.motorista.telefone ?? a.motorista.email,
        placas: a.motorista.veiculos.map((v) => v.placa),
        plano: a.plano.nome,
        valorCentavos: a.plano.valorCentavos,
        vagaFixa: a.vagaFixa?.numero ?? null,
        venceEm,
        status: statusAssinatura(venceEm, op.hoje, op.carenciaDias),
      };
    })
    .sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || a.venceEm.localeCompare(b.venceEm));
}

export async function listarPlanos(estacionamentoId: string) {
  return prisma.plano.findMany({
    where: { estacionamentoId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: { id: true, nome: true, valorCentavos: true, diasSemana: true, inicioMin: true, fimMin: true, ativo: true },
  });
}

/** Vagas ativas que ainda não são fixas de ninguém. */
export async function listarVagasParaFixar(estacionamentoId: string) {
  return prisma.vaga.findMany({
    where: { estacionamentoId, ativa: true, assinaturasFixas: { none: { encerradaEm: null } } },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true },
  });
}
