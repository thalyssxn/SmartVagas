import type { Prisma } from "@/generated/prisma/client";
import type { Contexto } from "./sessao";
import type { Transacao } from "./db";

type Registro = {
  acao: string;
  entidade: string;
  entidadeId?: string;
  dados?: Prisma.InputJsonValue;
};

/** Trilha de quem fez o quê com dinheiro e operação (docs/MVP_v1.1.md §8). */
export async function registrarAuditoria(tx: Transacao, contexto: Contexto, registro: Registro) {
  await tx.auditLog.create({
    data: {
      estacionamentoId: contexto.estacionamentoId,
      userId: contexto.usuarioId,
      ...registro,
    },
  });
}
