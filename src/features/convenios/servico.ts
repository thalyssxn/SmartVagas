import { z } from "zod";
import { obterOperacao } from "@/features/configuracao/queries";
import { lerReais } from "@/lib/dinheiro";
import { ErroDeNegocio } from "@/lib/resultado";
import { dataParaDia, diaParaData } from "@/lib/tempo";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma, type Transacao } from "@/server/db";
import type { Contexto } from "@/server/sessao";
import { convenioValido } from "./regras";

export const TIPOS_PARCEIRO = ["loja", "shopping", "evento", "empresa", "outro"] as const;
export const TIPOS_DESCONTO = ["percentual", "minutos", "valor"] as const;

export const convenioSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do parceiro.").max(80),
    tipo: z.enum(TIPOS_PARCEIRO),
    contato: z.string().trim().max(80).optional(),
    telefone: z.string().trim().max(20).optional(),
    tipoDesconto: z.enum(TIPOS_DESCONTO),
    /** Texto do campo: "20" (%), "60" (min) ou "5,00" (R$). */
    valor: z.string().trim().min(1, "Informe o desconto."),
    validoAte: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    observacao: z.string().trim().max(200).optional(),
  })
  .transform((d, ctx) => {
    let valorDesconto: number | null;
    if (d.tipoDesconto === "valor") valorDesconto = lerReais(d.valor);
    else valorDesconto = /^\d+$/.test(d.valor) ? Number(d.valor) : null;

    const limites = { percentual: [1, 100], minutos: [5, 1440], valor: [1, 100_000] } as const;
    const [min, max] = limites[d.tipoDesconto];
    if (valorDesconto === null || valorDesconto < min || valorDesconto > max) {
      const msg = {
        percentual: "Use uma porcentagem de 1 a 100.",
        minutos: "Use de 5 a 1440 minutos.",
        valor: "Valor inválido. Use o formato 5,00.",
      }[d.tipoDesconto];
      ctx.addIssue({ code: "custom", message: msg });
      return z.NEVER;
    }
    return { ...d, valorDesconto, validoAte: d.validoAte || null };
  });

export async function criarConvenio(contexto: Contexto, entrada: z.input<typeof convenioSchema>) {
  const d = convenioSchema.parse(entrada);
  const existente = await prisma.convenio.findFirst({
    where: { estacionamentoId: contexto.estacionamentoId, nome: d.nome },
    select: { id: true },
  });
  if (existente) throw new ErroDeNegocio("convenio_duplicado", `Já existe o convênio ${d.nome}.`);

  return prisma.$transaction(async (tx) => {
    const convenio = await tx.convenio.create({
      data: {
        estacionamentoId: contexto.estacionamentoId,
        nome: d.nome,
        tipo: d.tipo,
        contato: d.contato || null,
        telefone: d.telefone || null,
        tipoDesconto: d.tipoDesconto,
        valorDesconto: d.valorDesconto,
        validoAte: d.validoAte ? diaParaData(d.validoAte) : null,
        observacao: d.observacao || null,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "convenio.criado",
      entidade: "convenio",
      entidadeId: convenio.id,
      dados: { nome: d.nome, tipoDesconto: d.tipoDesconto, valorDesconto: d.valorDesconto },
    });
    return convenio;
  });
}

export async function alternarConvenio(contexto: Contexto, convenioId: string) {
  const convenio = await prisma.convenio.findFirst({
    where: { id: convenioId, estacionamentoId: contexto.estacionamentoId },
    select: { ativo: true, nome: true },
  });
  if (!convenio) throw new ErroDeNegocio("convenio_inexistente", "Convênio não encontrado.");
  await prisma.$transaction(async (tx) => {
    await tx.convenio.update({ where: { id: convenioId }, data: { ativo: !convenio.ativo } });
    await registrarAuditoria(tx, contexto, {
      acao: convenio.ativo ? "convenio.pausado" : "convenio.reativado",
      entidade: "convenio",
      entidadeId: convenioId,
      dados: { nome: convenio.nome },
    });
  });
  return { ativo: !convenio.ativo };
}

/** Na saída: o convênio precisa ser do estacionamento, estar ativo e dentro da validade. */
export async function buscarConvenioParaSaida(
  tx: Transacao,
  estacionamentoId: string,
  convenioId: string,
  hoje: string,
) {
  const convenio = await tx.convenio.findFirst({
    where: { id: convenioId, estacionamentoId },
    select: {
      id: true,
      nome: true,
      ativo: true,
      tipoDesconto: true,
      valorDesconto: true,
      validoAte: true,
    },
  });
  if (!convenio) throw new ErroDeNegocio("convenio_inexistente", "Convênio não encontrado.");
  if (!convenio.ativo)
    throw new ErroDeNegocio("convenio_pausado", `O convênio ${convenio.nome} está pausado.`);
  if (!convenioValido(convenio.validoAte ? dataParaDia(convenio.validoAte) : null, hoje)) {
    throw new ErroDeNegocio("convenio_vencido", `O convênio ${convenio.nome} venceu.`);
  }
  return convenio;
}

/** Lista curta para o guichê escolher na saída. */
export async function conveniosParaGuiche(estacionamentoId: string) {
  const { hoje } = await obterOperacao(estacionamentoId);
  const convenios = await prisma.convenio.findMany({
    where: { estacionamentoId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, tipoDesconto: true, valorDesconto: true, validoAte: true },
  });
  return convenios
    .filter((c) => convenioValido(c.validoAte ? dataParaDia(c.validoAte) : null, hoje))
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      tipoDesconto: c.tipoDesconto,
      valorDesconto: c.valorDesconto,
    }));
}

export type ConvenioNoGuiche = Awaited<ReturnType<typeof conveniosParaGuiche>>[number];
