"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirEquipe } from "@/server/sessao";
import { lancarRetroativo, type retroativoSchema } from "./retroativo";

export async function lancarRetroativoAction(entrada: z.input<typeof retroativoSchema>) {
  return executarAcao(async () => {
    const resultado = await lancarRetroativo(await exigirEquipe(), entrada);
    revalidatePath("/historico");
    revalidatePath("/patio");
    revalidatePath("/hoje");
    return resultado;
  });
}
