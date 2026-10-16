"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import { alternarConvenio, criarConvenio, type convenioSchema } from "./servico";

function atualizar() {
  revalidatePath("/convenios");
  revalidatePath("/patio");
}

export async function criarConvenioAction(entrada: z.input<typeof convenioSchema>) {
  return executarAcao(async () => {
    const r = await criarConvenio(await exigirEquipe(["dono"]), entrada);
    atualizar();
    return r;
  });
}

export async function alternarConvenioAction(convenioId: string) {
  return executarAcao(async () => {
    const r = await alternarConvenio(await exigirEquipe(["dono"]), z.uuid().parse(convenioId));
    atualizar();
    return r;
  });
}
