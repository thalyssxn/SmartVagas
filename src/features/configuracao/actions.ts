"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import {
  ajustarVaga,
  atualizarConfiguracao,
  atualizarEstacionamento,
  criarOperador,
  criarVaga,
  excluirVaga,
  type ajusteVagaSchema,
  type configuracaoSchema,
  type estacionamentoSchema,
  type novaVagaSchema,
  type operadorSchema,
} from "./servico";

// Tudo aqui é do dono. O operador nem vê a tela e, se chamar a action, é redirecionado.
async function dono() {
  return exigirEquipe(["dono"]);
}

function atualizar() {
  revalidatePath("/configuracoes");
  revalidatePath("/patio");
}

export async function atualizarConfiguracaoAction(entrada: z.input<typeof configuracaoSchema>) {
  return executarAcao(async () => {
    await atualizarConfiguracao(await dono(), entrada);
    atualizar();
  });
}

export async function atualizarEstacionamentoAction(entrada: z.input<typeof estacionamentoSchema>) {
  return executarAcao(async () => {
    await atualizarEstacionamento(await dono(), entrada);
    atualizar();
  });
}

export async function criarVagaAction(entrada: z.input<typeof novaVagaSchema>) {
  return executarAcao(async () => {
    const r = await criarVaga(await dono(), entrada);
    atualizar();
    return r;
  });
}

export async function ajustarVagaAction(entrada: z.input<typeof ajusteVagaSchema>) {
  return executarAcao(async () => {
    await ajustarVaga(await dono(), entrada);
    atualizar();
  });
}

export async function excluirVagaAction(vagaId: string) {
  return executarAcao(async () => {
    await excluirVaga(await dono(), vagaId);
    atualizar();
  });
}

export async function criarOperadorAction(entrada: z.input<typeof operadorSchema>) {
  return executarAcao(async () => {
    await criarOperador(await dono(), entrada);
    atualizar();
  });
}
