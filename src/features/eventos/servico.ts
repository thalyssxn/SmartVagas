import { z } from "zod";
import { obterOperacao } from "@/features/configuracao/queries";
import { ErroDeNegocio } from "@/lib/resultado";
import { lerHorarioLocal } from "@/lib/tempo";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma } from "@/server/db";
import type { Contexto } from "@/server/sessao";

export const CATEGORIAS_EVENTO = [
  "Show",
  "Esporte",
  "Feira",
  "Teatro",
  "Congresso",
  "Festa",
  "Outro",
] as const;

export const eventoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do evento.").max(80),
  local: z.string().trim().min(2, "Informe onde acontece.").max(80),
  categoria: z.enum(CATEGORIAS_EVENTO).optional(),
  descricao: z.string().trim().max(240, "Descrição muito longa.").optional(),
  inicio: z.string().min(1, "Informe o início."),
  fim: z.string().min(1, "Informe o fim."),
});

export async function criarEvento(contexto: Contexto, entrada: z.input<typeof eventoSchema>) {
  const d = eventoSchema.parse(entrada);
  const { fuso, agora } = await obterOperacao(contexto.estacionamentoId);
  const inicioEm = lerHorarioLocal(d.inicio, fuso);
  const fimEm = lerHorarioLocal(d.fim, fuso);
  if (!inicioEm || !fimEm) throw new ErroDeNegocio("horario_invalido", "Data ou hora inválida.");
  if (fimEm <= inicioEm)
    throw new ErroDeNegocio("horario_invalido", "O fim precisa ser depois do início.");
  if (fimEm <= agora) throw new ErroDeNegocio("horario_invalido", "Esse evento já terminou.");

  return prisma.$transaction(async (tx) => {
    const evento = await tx.evento.create({
      data: {
        estacionamentoId: contexto.estacionamentoId,
        nome: d.nome,
        local: d.local,
        categoria: d.categoria ?? null,
        descricao: d.descricao || null,
        inicioEm,
        fimEm,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "evento.criado",
      entidade: "evento",
      entidadeId: evento.id,
      dados: { nome: d.nome },
    });
    return evento;
  });
}

export async function alternarEvento(contexto: Contexto, eventoId: string) {
  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, estacionamentoId: contexto.estacionamentoId },
    select: { ativo: true },
  });
  if (!evento) throw new ErroDeNegocio("evento_inexistente", "Evento não encontrado.");
  await prisma.evento.update({ where: { id: eventoId }, data: { ativo: !evento.ativo } });
  return { ativo: !evento.ativo };
}
