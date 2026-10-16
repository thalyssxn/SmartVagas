"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import { abrirTurno, fecharTurno, type abrirTurnoSchema, type fecharTurnoSchema } from "./servico";

export async function abrirTurnoAction(entrada: z.input<typeof abrirTurnoSchema>) {
  return executarAcao(async () => {
    const resultado = await abrirTurno(await exigirEquipe(), entrada);
    revalidatePath("/caixa");
    return resultado;
  });
}

export async function fecharTurnoAction(entrada: z.input<typeof fecharTurnoSchema>) {
  return executarAcao(async () => {
    const resultado = await fecharTurno(await exigirEquipe(), entrada);
    revalidatePath("/caixa");
    return resultado;
  });
}
