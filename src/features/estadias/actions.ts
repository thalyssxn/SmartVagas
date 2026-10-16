"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import { consultar, type consultaSchema } from "./consulta";
import { darEntrada, darSaida, type entradaSchema, type saidaSchema } from "./servico";

function atualizarTelasDaOperacao() {
  revalidatePath("/patio");
  revalidatePath("/dentro");
  revalidatePath("/hoje");
}

export async function consultarAction(entrada: z.input<typeof consultaSchema>) {
  return executarAcao(async () => consultar(await exigirEquipe(), entrada));
}

export async function darEntradaAction(entrada: z.input<typeof entradaSchema>) {
  return executarAcao(async () => {
    const resultado = await darEntrada(await exigirEquipe(), entrada);
    atualizarTelasDaOperacao();
    return resultado;
  });
}

export async function darSaidaAction(entrada: z.input<typeof saidaSchema>) {
  return executarAcao(async () => {
    const resultado = await darSaida(await exigirEquipe(), entrada);
    atualizarTelasDaOperacao();
    return resultado;
  });
}
