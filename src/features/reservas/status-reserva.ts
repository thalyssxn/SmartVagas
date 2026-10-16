import type { StatusReserva, TipoVaga } from "@/generated/prisma/enums";

export const ROTULO_STATUS_RESERVA: Record<
  StatusReserva,
  { rotulo: string; variant: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  pendente: { rotulo: "Aguardando pagamento", variant: "warning" },
  confirmada: { rotulo: "Confirmada", variant: "success" },
  em_uso: { rotulo: "Em uso", variant: "info" },
  concluida: { rotulo: "Concluída", variant: "neutral" },
  cancelada: { rotulo: "Cancelada", variant: "neutral" },
  expirada: { rotulo: "Expirada", variant: "neutral" },
};

export type ReservaParaTela = {
  id: string;
  codigo: string;
  placa: string;
  status: StatusReserva;
  inicioEm: string;
  fimEm: string;
  expiraEm: string;
  valorCentavos: number;
  reembolsoCentavos: number;
  reembolsada: boolean;
  vaga: string;
  tipoVaga: TipoVaga;
  nome: string;
  evento: string | null;
};

export function paraTela(reserva: {
  id: string;
  codigo: string;
  placa: string;
  status: StatusReserva;
  inicioEm: Date;
  fimEm: Date;
  expiraEm: Date;
  valorCentavos: number;
  reembolsoCentavos: number;
  reembolsadaEm: Date | null;
  vaga: { numero: string; tipo: TipoVaga };
  motorista: { nome: string };
  evento?: { nome: string } | null;
}): ReservaParaTela {
  return {
    id: reserva.id,
    codigo: reserva.codigo,
    placa: reserva.placa,
    status: reserva.status,
    inicioEm: reserva.inicioEm.toISOString(),
    fimEm: reserva.fimEm.toISOString(),
    expiraEm: reserva.expiraEm.toISOString(),
    valorCentavos: reserva.valorCentavos,
    reembolsoCentavos: reserva.reembolsoCentavos,
    reembolsada: reserva.reembolsadaEm !== null,
    vaga: reserva.vaga.numero,
    tipoVaga: reserva.vaga.tipo,
    nome: reserva.motorista.nome,
    evento: reserva.evento?.nome ?? null,
  };
}
