import { z } from "zod";
import { obterOperacao } from "@/features/configuracao/queries";
import { reaisOpcionalSchema, reaisSchema } from "@/lib/dinheiro";
import { ErroDeNegocio } from "@/lib/resultado";
import { diaParaData } from "@/lib/tempo";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma } from "@/server/db";
import type { Contexto } from "@/server/sessao";
import { competenciaValida, ultimoDiaDoMes } from "./periodo";
import { custoDoFuncionario } from "./regras";

const CATEGORIAS = ["aluguel", "energia", "agua", "manutencao", "outros"] as const;

export const funcionarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  funcao: z.string().trim().min(2, "Informe a função.").max(40),
  salario: reaisSchema,
  encargos: reaisOpcionalSchema,
});

export const valoresFuncionarioSchema = z.object({
  funcionarioId: z.uuid(),
  salario: reaisSchema,
  encargos: reaisOpcionalSchema,
});

export const custoSchema = z.object({
  categoria: z.enum(CATEGORIAS),
  descricao: z.string().trim().min(2, "Descreva o custo.").max(100),
  valor: reaisSchema.refine((v) => v > 0, "O valor precisa ser maior que zero."),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
});

export async function criarFuncionario(contexto: Contexto, entrada: z.input<typeof funcionarioSchema>) {
  const dados = funcionarioSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const funcionario = await tx.funcionario.create({
      data: {
        estacionamentoId: contexto.estacionamentoId,
        nome: dados.nome,
        funcao: dados.funcao,
        salarioCentavos: dados.salario,
        encargosCentavos: dados.encargos,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "funcionario.criado",
      entidade: "funcionario",
      entidadeId: funcionario.id,
      dados: { nome: dados.nome },
    });
    return funcionario;
  });
}

export async function atualizarValoresFuncionario(
  contexto: Contexto,
  entrada: z.input<typeof valoresFuncionarioSchema>,
) {
  const { funcionarioId, salario, encargos } = valoresFuncionarioSchema.parse(entrada);
  // Só vale dali em diante: meses já lançados guardam o valor da época (snapshot na folha).
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.funcionario.updateMany({
      where: { id: funcionarioId, estacionamentoId: contexto.estacionamentoId },
      data: { salarioCentavos: salario, encargosCentavos: encargos },
    });
    if (count === 0) throw new ErroDeNegocio("funcionario_inexistente", "Funcionário não encontrado.");
    await registrarAuditoria(tx, contexto, {
      acao: "funcionario.valores",
      entidade: "funcionario",
      entidadeId: funcionarioId,
      dados: { salarioCentavos: salario, encargosCentavos: encargos },
    });
  });
}

export async function alternarFuncionario(contexto: Contexto, funcionarioId: string) {
  const f = await prisma.funcionario.findFirst({
    where: { id: funcionarioId, estacionamentoId: contexto.estacionamentoId },
    select: { ativo: true },
  });
  if (!f) throw new ErroDeNegocio("funcionario_inexistente", "Funcionário não encontrado.");
  await prisma.funcionario.update({ where: { id: funcionarioId }, data: { ativo: !f.ativo } });
}

export async function criarCusto(contexto: Contexto, entrada: z.input<typeof custoSchema>) {
  const dados = custoSchema.parse(entrada);
  return prisma.$transaction(async (tx) => {
    const custo = await tx.custo.create({
      data: {
        estacionamentoId: contexto.estacionamentoId,
        categoria: dados.categoria,
        descricao: dados.descricao,
        valorCentavos: dados.valor,
        data: diaParaData(dados.data),
        criadoPorId: contexto.usuarioId,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "custo.criado",
      entidade: "custo",
      entidadeId: custo.id,
      dados: { categoria: dados.categoria, valorCentavos: dados.valor },
    });
    return custo;
  });
}

export async function excluirCusto(contexto: Contexto, custoId: string) {
  await prisma.$transaction(async (tx) => {
    const custo = await tx.custo.findFirst({
      where: { id: custoId, estacionamentoId: contexto.estacionamentoId },
      select: { descricao: true, valorCentavos: true, categoria: true },
    });
    if (!custo) throw new ErroDeNegocio("custo_inexistente", "Custo não encontrado.");
    await tx.custo.delete({ where: { id: custoId } });
    await registrarAuditoria(tx, contexto, {
      acao: "custo.excluido",
      entidade: "custo",
      entidadeId: custoId,
      dados: custo,
    });
  });
}

/**
 * RF-07c: um custo por funcionário ativo, com os valores de hoje congelados.
 * Rodar duas vezes não duplica (único por funcionário e competência).
 */
export async function lancarFolha(contexto: Contexto, competencia: string) {
  if (!competenciaValida(competencia)) throw new ErroDeNegocio("competencia_invalida", "Mês inválido.");
  const op = await obterOperacao(contexto.estacionamentoId);
  // Mês corrente lança hoje; mês passado vai para o último dia dele.
  const data = op.hoje.startsWith(competencia) ? op.hoje : ultimoDiaDoMes(competencia);

  const funcionarios = await prisma.funcionario.findMany({
    where: { estacionamentoId: contexto.estacionamentoId, ativo: true },
    select: { id: true, nome: true, salarioCentavos: true, encargosCentavos: true },
  });
  if (funcionarios.length === 0) throw new ErroDeNegocio("sem_funcionarios", "Nenhum funcionário ativo.");

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.custo.createMany({
      data: funcionarios.map((f) => ({
        estacionamentoId: contexto.estacionamentoId,
        categoria: "folha" as const,
        descricao: `Folha ${competencia} · ${f.nome}`,
        valorCentavos: custoDoFuncionario(f.salarioCentavos, f.encargosCentavos),
        data: diaParaData(data),
        funcionarioId: f.id,
        competencia,
        criadoPorId: contexto.usuarioId,
      })),
      skipDuplicates: true,
    });
    await registrarAuditoria(tx, contexto, {
      acao: "folha.lancada",
      entidade: "folha",
      dados: { competencia, lancados: count, ignorados: funcionarios.length - count },
    });
    return { lancados: count, jaLancados: funcionarios.length - count };
  });
}
