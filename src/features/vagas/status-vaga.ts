export type StatusVaga = "livre" | "ocupada" | "reservada" | "bloqueada";

/**
 * Prioridade: bloqueio > carro dentro > reserva.
 * "Reservada" = vaga fixa de mensalista com plano valendo (RN-04) ou reserva de motorista
 * começando em breve (RN-10). Mensalista suspenso perde a vaga fixa (RN-06).
 */
export function statusDaVaga(vaga: {
  ativa: boolean;
  temEstadiaAberta: boolean;
  temMensalistaFixoValendo: boolean;
  temReservaProxima?: boolean;
}): StatusVaga {
  if (!vaga.ativa) return "bloqueada";
  if (vaga.temEstadiaAberta) return "ocupada";
  if (vaga.temMensalistaFixoValendo || vaga.temReservaProxima) return "reservada";
  return "livre";
}
