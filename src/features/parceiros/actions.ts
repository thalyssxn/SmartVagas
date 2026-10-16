"use server";

import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { cadastrarParceiro, type parceiroSchema } from "./servico";

/** Público: qualquer pessoa pode cadastrar o próprio estacionamento. O login vem logo depois. */
export async function cadastrarParceiroAction(entrada: z.input<typeof parceiroSchema>) {
  return executarAcao(() => cadastrarParceiro(entrada));
}
