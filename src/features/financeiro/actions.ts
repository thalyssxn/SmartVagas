"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import {
  alternarFuncionario,
  atualizarValoresFuncionario,
  criarCusto,
  criarFuncionario,
  excluirCusto,
  lancarFolha,
  type custoSchema,
  type funcionarioSchema,
  type valoresFuncionarioSchema,
} from "./servico";

// Financeiro e equipe são só do dono: operador não vê salário nem lucro.
async function dono() {
  return exigirEquipe(["dono"]);
}

function atualizar() {
  revalidatePath("/financeiro");
}

export async function criarFuncionarioAction(entrada: z.input<typeof funcionarioSchema>) {
  return executarAcao(async () => {
    const r = await criarFuncionario(await dono(), entrada);
    atualizar();
    return r;
  });
}

export async function atualizarValoresFuncionarioAction(entrada: z.input<typeof valoresFuncionarioSchema>) {
  return executarAcao(async () => {
    await atualizarValoresFuncionario(await dono(), entrada);
    atualizar();
  });
}

export async function alternarFuncionarioAction(funcionarioId: string) {
  return executarAcao(async () => {
    await alternarFuncionario(await dono(), funcionarioId);
    atualizar();
  });
}

export async function criarCustoAction(entrada: z.input<typeof custoSchema>) {
  return executarAcao(async () => {
    const r = await criarCusto(await dono(), entrada);
    atualizar();
    return r;
  });
}

export async function excluirCustoAction(custoId: string) {
  return executarAcao(async () => {
    await excluirCusto(await dono(), custoId);
    atualizar();
  });
}

export async function lancarFolhaAction(competencia: string) {
  return executarAcao(async () => {
    const r = await lancarFolha(await dono(), competencia);
    atualizar();
    return r;
  });
}
