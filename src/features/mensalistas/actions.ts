"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import {
  alternarPlano,
  baixarMensalidade,
  cadastrarMensalista,
  criarPlano,
  encerrarAssinatura,
  type baixaSchema,
  type mensalistaSchema,
  type planoSchema,
} from "./servico";

function atualizar() {
  revalidatePath("/mensalistas");
  revalidatePath("/hoje");
  revalidatePath("/patio");
}

// Operador dá baixa; plano e cadastro são do dono (docs/MVP_v1.1.md §8).
export async function baixarMensalidadeAction(entrada: z.input<typeof baixaSchema>) {
  return executarAcao(async () => {
    const resultado = await baixarMensalidade(await exigirEquipe(), entrada);
    atualizar();
    return resultado;
  });
}

export async function cadastrarMensalistaAction(entrada: z.input<typeof mensalistaSchema>) {
  return executarAcao(async () => {
    const resultado = await cadastrarMensalista(await exigirEquipe(["dono"]), entrada);
    atualizar();
    return resultado;
  });
}

export async function encerrarAssinaturaAction(assinaturaId: string) {
  return executarAcao(async () => {
    await encerrarAssinatura(await exigirEquipe(["dono"]), assinaturaId);
    atualizar();
  });
}

export async function criarPlanoAction(entrada: z.input<typeof planoSchema>) {
  return executarAcao(async () => {
    const resultado = await criarPlano(await exigirEquipe(["dono"]), entrada);
    atualizar();
    return resultado;
  });
}

export async function alternarPlanoAction(planoId: string) {
  return executarAcao(async () => {
    await alternarPlano(await exigirEquipe(["dono"]), planoId);
    atualizar();
  });
}
