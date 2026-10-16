"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import { alternarEvento, criarEvento, type eventoSchema } from "./servico";

function atualizar() {
  revalidatePath("/agenda");
  revalidatePath("/eventos");
}

export async function criarEventoAction(entrada: z.input<typeof eventoSchema>) {
  return executarAcao(async () => {
    const r = await criarEvento(await exigirEquipe(["dono"]), entrada);
    atualizar();
    return r;
  });
}

export async function alternarEventoAction(eventoId: string) {
  return executarAcao(async () => {
    const r = await alternarEvento(await exigirEquipe(["dono"]), z.uuid().parse(eventoId));
    atualizar();
    return r;
  });
}
