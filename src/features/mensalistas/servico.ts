import { z } from "zod";
import { obterOperacao } from "@/features/configuracao/queries";
import { reaisSchema } from "@/lib/dinheiro";
import { placaSchema } from "@/lib/placa";
import { ErroDeNegocio } from "@/lib/resultado";
import { dataParaDia, diaParaData } from "@/lib/tempo";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma } from "@/server/db";
import type { Contexto } from "@/server/sessao";
import { hhmmParaMinutos } from "./janela";
import { proximoVencimento, statusAssinatura } from "./status-assinatura";

const horaOpcional = z.string().optional();

export const planoSchema = z
  .object({
    nome: z.string().trim().min(2, "Dê um nome ao plano.").max(40, "Nome muito longo."),
    valor: reaisSchema,
    diasSemana: z.array(z.number().int().min(0).max(6)).min(1, "Escolha ao menos um dia."),
    inicio: horaOpcional,
    fim: horaOpcional,
  })
  .refine((p) => Boolean(p.inicio) === Boolean(p.fim), {
    message: "Informe início e fim do horário, ou deixe os dois vazios para o dia inteiro.",
  })
  .refine((p) => !p.inicio || (hhmmParaMinutos(p.inicio) !== null && hhmmParaMinutos(p.fim) !== null), {
    message: "Horário inválido.",
  });

export const mensalistaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  telefone: z.string().trim().max(20).optional(),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]).optional(),
  placa: placaSchema,
  modelo: z.string().trim().max(40).optional(),
  planoId: z.uuid("Escolha o plano."),
  vagaFixaId: z.union([z.literal(""), z.uuid()]).optional(),
});

export const baixaSchema = z.object({
  assinaturaId: z.uuid(),
  formaPagamento: z.enum(["dinheiro", "pix", "cartao"]),
});

export async function criarPlano(contexto: Contexto, entrada: z.input<typeof planoSchema>) {
  const dados = planoSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const plano = await tx.plano.create({
      data: {
        estacionamentoId: contexto.estacionamentoId,
        nome: dados.nome,
        valorCentavos: dados.valor,
        diasSemana: dados.diasSemana,
        inicioMin: hhmmParaMinutos(dados.inicio),
        fimMin: hhmmParaMinutos(dados.fim),
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "plano.criado",
      entidade: "plano",
      entidadeId: plano.id,
      dados: { nome: dados.nome, valorCentavos: dados.valor },
    });
    return plano;
  });
}

export async function alternarPlano(contexto: Contexto, planoId: string) {
  const plano = await prisma.plano.findFirst({
    where: { id: planoId, estacionamentoId: contexto.estacionamentoId },
    select: { ativo: true, nome: true },
  });
  if (!plano) throw new ErroDeNegocio("plano_inexistente", "Plano não encontrado.");
  await prisma.$transaction(async (tx) => {
    await tx.plano.update({ where: { id: planoId }, data: { ativo: !plano.ativo } });
    await registrarAuditoria(tx, contexto, {
      acao: plano.ativo ? "plano.desativado" : "plano.ativado",
      entidade: "plano",
      entidadeId: planoId,
    });
  });
}

/** Cadastra pessoa + veículo + assinatura. O 1º pagamento entra pela baixa. */
export async function cadastrarMensalista(
  contexto: Contexto,
  entrada: z.input<typeof mensalistaSchema>,
) {
  const dados = mensalistaSchema.parse(entrada);
  const { estacionamentoId } = contexto;
  const op = await obterOperacao(estacionamentoId);

  const plano = await prisma.plano.findFirst({
    where: { id: dados.planoId, estacionamentoId, ativo: true },
    select: { id: true },
  });
  if (!plano) throw new ErroDeNegocio("plano_inexistente", "Plano não encontrado ou desativado.");

  if (dados.vagaFixaId) {
    const ocupada = await prisma.assinatura.findFirst({
      where: { vagaFixaId: dados.vagaFixaId, encerradaEm: null },
      select: { motorista: { select: { nome: true } } },
    });
    if (ocupada) {
      throw new ErroDeNegocio("vaga_fixa_ocupada", `Essa vaga já é fixa de ${ocupada.motorista.nome}.`);
    }
  }

  const jaTem = await prisma.assinatura.findFirst({
    where: { encerradaEm: null, motorista: { estacionamentoId, veiculos: { some: { placa: dados.placa } } } },
    select: { motorista: { select: { nome: true } } },
  });
  if (jaTem) {
    throw new ErroDeNegocio("placa_ja_mensalista", `${dados.placa} já é mensalista (${jaTem.motorista.nome}).`);
  }

  return prisma.$transaction(async (tx) => {
    const motorista = await tx.motorista.create({
      data: {
        estacionamentoId,
        nome: dados.nome,
        telefone: dados.telefone || null,
        email: dados.email || null,
        veiculos: { create: { placa: dados.placa, modelo: dados.modelo || null } },
      },
      select: { id: true },
    });
    const assinatura = await tx.assinatura.create({
      data: {
        motoristaId: motorista.id,
        planoId: dados.planoId,
        vagaFixaId: dados.vagaFixaId || null,
        // Vence hoje: o 1º pagamento (baixa) leva para daqui a um mês.
        venceEm: diaParaData(op.hoje),
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "mensalista.cadastrado",
      entidade: "assinatura",
      entidadeId: assinatura.id,
      dados: { nome: dados.nome, placa: dados.placa },
    });
    return { assinaturaId: assinatura.id };
  });
}

export async function baixarMensalidade(contexto: Contexto, entrada: z.input<typeof baixaSchema>) {
  const { assinaturaId, formaPagamento } = baixaSchema.parse(entrada);
  const op = await obterOperacao(contexto.estacionamentoId);

  return prisma.$transaction(async (tx) => {
    const assinatura = await tx.assinatura.findFirst({
      where: { id: assinaturaId, encerradaEm: null, motorista: { estacionamentoId: contexto.estacionamentoId } },
      select: { venceEm: true, plano: { select: { valorCentavos: true } }, motorista: { select: { nome: true } } },
    });
    if (!assinatura) throw new ErroDeNegocio("assinatura_inexistente", "Mensalista não encontrado.");

    const venceEm = dataParaDia(assinatura.venceEm);
    const status = statusAssinatura(venceEm, op.hoje, op.carenciaDias);
    const novoVencimento = proximoVencimento(venceEm, op.hoje, status);
    const turno = await tx.turno.findFirst({
      where: { operadorId: contexto.usuarioId, fechadoEm: null },
      select: { id: true },
    });

    await tx.pagamentoMensalidade.create({
      data: {
        estacionamentoId: contexto.estacionamentoId,
        assinaturaId,
        valorCentavos: assinatura.plano.valorCentavos,
        formaPagamento,
        periodoAte: diaParaData(novoVencimento),
        turnoId: turno?.id ?? null,
        registradoPorId: contexto.usuarioId,
      },
    });
    await tx.assinatura.update({ where: { id: assinaturaId }, data: { venceEm: diaParaData(novoVencimento) } });
    await registrarAuditoria(tx, contexto, {
      acao: "mensalidade.baixa",
      entidade: "assinatura",
      entidadeId: assinaturaId,
      dados: { valorCentavos: assinatura.plano.valorCentavos, formaPagamento, venceEm: novoVencimento },
    });
    return { nome: assinatura.motorista.nome, venceEm: novoVencimento, valorCentavos: assinatura.plano.valorCentavos };
  });
}

export async function encerrarAssinatura(contexto: Contexto, assinaturaId: string) {
  const { count } = await prisma.assinatura.updateMany({
    where: { id: assinaturaId, encerradaEm: null, motorista: { estacionamentoId: contexto.estacionamentoId } },
    data: { encerradaEm: new Date(), vagaFixaId: null },
  });
  if (count === 0) throw new ErroDeNegocio("assinatura_inexistente", "Mensalista não encontrado.");
  await prisma.$transaction((tx) =>
    registrarAuditoria(tx, contexto, { acao: "mensalista.encerrado", entidade: "assinatura", entidadeId: assinaturaId }),
  );
}
