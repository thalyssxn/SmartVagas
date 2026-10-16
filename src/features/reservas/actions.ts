"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirCliente, exigirEquipe } from "@/server/sessao";
import {
  buscarDisponibilidade,
  cancelarReserva,
  cancelarReservaDoCliente,
  confirmarPagamento,
  criarReserva,
  marcarReembolsada,
  type periodoSchema,
  type reservaSchema,
} from "./servico";

function atualizarTelas() {
  revalidatePath("/cliente", "layout");
  revalidatePath("/reservas");
  revalidatePath("/patio");
}

export async function buscarDisponibilidadeAction(entrada: z.input<typeof periodoSchema>) {
  return executarAcao(async () => {
    await exigirCliente();
    return buscarDisponibilidade(entrada);
  });
}

export async function criarReservaAction(entrada: z.input<typeof reservaSchema>) {
  return executarAcao(async () => {
    const reserva = await criarReserva(await exigirCliente(), entrada);
    atualizarTelas();
    return reserva;
  });
}

export async function cancelarMinhaReservaAction(reservaId: string) {
  return executarAcao(async () => {
    const resultado = await cancelarReservaDoCliente(await exigirCliente(), reservaId);
    atualizarTelas();
    return resultado;
  });
}

export async function cancelarReservaNoGuicheAction(reservaId: string) {
  return executarAcao(async () => {
    const resultado = await cancelarReserva(await exigirEquipe(), reservaId);
    atualizarTelas();
    return resultado;
  });
}

export async function confirmarPagamentoAction(reservaId: string) {
  return executarAcao(async () => {
    const resultado = await confirmarPagamento(await exigirEquipe(), reservaId);
    atualizarTelas();
    return resultado;
  });
}

export async function marcarReembolsadaAction(reservaId: string) {
  return executarAcao(async () => {
    await marcarReembolsada(await exigirEquipe(), reservaId);
    atualizarTelas();
  });
}
