import type { Operacao } from "@/features/configuracao/queries";
import { paraPlanoAplicado } from "@/features/mensalistas/queries";
import { prisma } from "@/server/db";
import { calcularCobranca } from "./cobranca";

export type CarroDentro = {
  id: string;
  placa: string;
  modelo: string | null;
  vaga: string;
  entradaEm: Date;
  minutos: number;
  /** Quanto pagaria se saísse agora. */
  valorCentavos: number;
  plano: string | null;
  /** RN-09: permanência acima do limite configurado pelo dono. */
  alerta: boolean;
};

export async function listarDentro(estacionamentoId: string, op: Operacao): Promise<CarroDentro[]> {
  const abertas = await prisma.estadia.findMany({
    where: { estacionamentoId, saidaEm: null },
    orderBy: { entradaEm: "asc" },
    select: {
      id: true,
      placa: true,
      modelo: true,
      entradaEm: true,
      vaga: { select: { numero: true } },
      reserva: { select: { codigo: true, inicioEm: true, fimEm: true } },
      assinatura: {
        select: {
          plano: { select: { nome: true, diasSemana: true, inicioMin: true, fimMin: true } },
        },
      },
    },
  });

  return abertas.map((estadia) => {
    const plano = estadia.assinatura ? paraPlanoAplicado(estadia.assinatura.plano) : null;
    const cobranca = calcularCobranca(
      estadia.entradaEm,
      op.agora,
      op.tabela,
      op.fuso,
      plano,
      estadia.reserva,
    );
    return {
      id: estadia.id,
      placa: estadia.placa,
      modelo: estadia.modelo,
      vaga: estadia.vaga.numero,
      entradaEm: estadia.entradaEm,
      minutos: cobranca.minutosTotais,
      valorCentavos: cobranca.valorCentavos,
      plano: cobranca.plano,
      alerta: cobranca.minutosTotais > op.alertaPermanenciaMin,
    };
  });
}
