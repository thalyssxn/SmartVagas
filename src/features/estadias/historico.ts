import { z } from "zod";
import { normalizarPlaca } from "@/lib/placa";
import { inicioDoDia } from "@/lib/tempo";
import { prisma } from "@/server/db";

const LIMITE = 200;
const DIA_MS = 86_400_000;

export const filtroHistoricoSchema = z.object({
  placa: z.string().optional(),
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** RF-04b: entradas e saídas, filtráveis por placa (parcial) e período (dias, inclusive). */
export async function listarHistorico(
  estacionamentoId: string,
  filtro: z.infer<typeof filtroHistoricoSchema>,
  fuso: string,
) {
  const placa = filtro.placa ? normalizarPlaca(filtro.placa) : "";
  const inicio = filtro.de ? inicioDoDia(new Date(`${filtro.de}T12:00:00Z`), fuso) : null;
  const fim = filtro.ate ? new Date(inicioDoDia(new Date(`${filtro.ate}T12:00:00Z`), fuso).getTime() + DIA_MS) : null;

  const estadias = await prisma.estadia.findMany({
    where: {
      estacionamentoId,
      ...(placa && { placa: { contains: placa } }),
      ...((inicio || fim) && { entradaEm: { ...(inicio && { gte: inicio }), ...(fim && { lt: fim }) } }),
    },
    orderBy: { entradaEm: "desc" },
    take: LIMITE + 1,
    select: {
      id: true,
      placa: true,
      entradaEm: true,
      saidaEm: true,
      valorCentavos: true,
      formaPagamento: true,
      retroativa: true,
      vaga: { select: { numero: true } },
    },
  });
  return { estadias: estadias.slice(0, LIMITE), truncado: estadias.length > LIMITE };
}
