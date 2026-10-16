"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirCliente } from "@/server/sessao";
import { adicionarVeiculo, removerVeiculo, type veiculoSchema } from "./servico";

export async function adicionarVeiculoAction(entrada: z.input<typeof veiculoSchema>) {
  return executarAcao(async () => {
    const resultado = await adicionarVeiculo(await exigirCliente(), entrada);
    revalidatePath("/cliente", "layout");
    return resultado;
  });
}

export async function removerVeiculoAction(veiculoId: string) {
  return executarAcao(async () => {
    await removerVeiculo(await exigirCliente(), veiculoId);
    revalidatePath("/cliente", "layout");
  });
}
