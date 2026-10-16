"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { executarAcao } from "@/server/acao";
import { exigirCliente } from "@/server/sessao";
import { cancelarAlertaVaga, criarAlertaVaga, marcarAvisosLidos } from "./servico";

export async function criarAlertaVagaAction(estacionamentoId: string) {
  return executarAcao(async () => {
    const id = z.uuid().parse(estacionamentoId);
    const resultado = await criarAlertaVaga(await exigirCliente(`/estacionamentos/${id}`), id);
    revalidatePath("/cliente/avisos");
    return resultado;
  });
}

export async function cancelarAlertaVagaAction(alertaId: string) {
  return executarAcao(async () => {
    await cancelarAlertaVaga(await exigirCliente(), z.uuid().parse(alertaId));
    revalidatePath("/cliente/avisos");
  });
}

export async function marcarAvisosLidosAction() {
  return executarAcao(async () => {
    const cliente = await exigirCliente();
    await marcarAvisosLidos(cliente.usuarioId);
    revalidatePath("/cliente", "layout");
  });
}
