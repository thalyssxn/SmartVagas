import { prisma } from "@/server/db";
import { esperadoNaGaveta } from "./regras";
import { recebimentosDoTurno } from "./servico";

export async function turnoAbertoDoOperador(operadorId: string) {
  const turno = await prisma.turno.findFirst({
    where: { operadorId, fechadoEm: null },
    select: { id: true, abertoEm: true, trocoInicialCentavos: true },
  });
  if (!turno) return null;

  const recebimentos = await recebimentosDoTurno(prisma, turno.id);
  return {
    ...turno,
    recebimentos,
    esperadoCentavos: esperadoNaGaveta(turno.trocoInicialCentavos, recebimentos),
  };
}

/** Para o dono conferir as diferenças dos turnos já fechados. */
export async function listarTurnosFechados(estacionamentoId: string) {
  return prisma.turno.findMany({
    where: { estacionamentoId, fechadoEm: { not: null } },
    orderBy: { fechadoEm: "desc" },
    take: 20,
    select: {
      id: true,
      abertoEm: true,
      fechadoEm: true,
      esperadoCentavos: true,
      contadoCentavos: true,
      observacao: true,
      operador: { select: { name: true } },
    },
  });
}
