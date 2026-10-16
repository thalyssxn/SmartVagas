"use client";

import { CalendarDays, Copy, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Placa } from "@/components/placa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDataHora, formatarHora } from "@/lib/tempo";
import { ROTULO_TIPO_VAGA } from "@/lib/veiculo";
import { cancelarMinhaReservaAction } from "../actions";
import { avisoTaxaAdicional } from "../excedente";
import type { ReservaDoCliente } from "../queries";
import { ROTULO_STATUS_RESERVA } from "../status-reserva";
import { TempoReserva } from "./tempo-reserva";

export function CartaoReserva({ reserva, fuso }: { reserva: ReservaDoCliente; fuso: string }) {
  const [pendente, iniciar] = useTransition();
  const { rotulo, variant } = ROTULO_STATUS_RESERVA[reserva.status];
  const cancelavel = reserva.status === "pendente" || reserva.status === "confirmada";
  const aguardando = reserva.status === "pendente";
  const valendo = reserva.status === "confirmada" || reserva.status === "em_uso";
  const encerrada =
    reserva.status === "expirada" ||
    reserva.status === "cancelada" ||
    reserva.status === "concluida";

  function cancelar() {
    const aviso =
      reserva.status === "confirmada" && !reserva.cancelamentoGratis
        ? "Fora do prazo de cancelamento grátis: parte do valor pago pode ficar retida. Cancelar mesmo assim?"
        : "Cancelar esta reserva?";
    if (!window.confirm(aviso)) return;

    iniciar(async () => {
      const resultado = await cancelarMinhaReservaAction(reserva.id);
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      const { paga, reembolsoCentavos } = resultado.dados;
      toast.success(
        paga && reembolsoCentavos > 0
          ? `Reserva cancelada. O estacionamento vai devolver ${formatarCentavos(reembolsoCentavos)}.`
          : "Reserva cancelada.",
      );
    });
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(reserva.codigo);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar. Anote o código.");
    }
  }

  return (
    <Card id={reserva.id} className={encerrada ? "space-y-3 opacity-80" : "space-y-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/estacionamentos/${reserva.estacionamento.id}`}
            className="block text-lg leading-tight font-bold hover:underline"
          >
            {reserva.estacionamento.nome}
          </Link>
          <p className="flex items-center gap-1 truncate text-sm text-slate-500">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {reserva.estacionamento.endereco}
          </p>
          {reserva.evento && (
            <p className="text-faixa-escura flex items-center gap-1 text-sm font-semibold">
              <CalendarDays className="size-3.5" aria-hidden />
              {reserva.evento}
            </p>
          )}
        </div>
        <Badge variant={variant}>{rotulo}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Placa valor={reserva.placa} tamanho="md" />
        <p className="text-sm text-slate-600">
          {formatarDataHora(new Date(reserva.inicioEm), fuso)} →{" "}
          {formatarHora(new Date(reserva.fimEm), fuso)}
          <br />
          Vaga <strong className="text-tinta">{reserva.vaga}</strong>
          {reserva.tipoVaga !== "comum" && ` (${ROTULO_TIPO_VAGA[reserva.tipoVaga]})`} ·{" "}
          <strong className="text-tinta">{formatarCentavos(reserva.valorCentavos)}</strong>
        </p>
      </div>

      {!encerrada && (
        <button
          type="button"
          onClick={copiarCodigo}
          aria-label={`Copiar código ${reserva.codigo}`}
          className="textura-asfalto flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-white"
        >
          <span>
            <span className="block text-xs font-medium text-slate-300">
              Código da reserva (mostre no guichê)
            </span>
            <span className="font-display text-faixa text-4xl font-bold tracking-[0.2em]">
              {reserva.codigo}
            </span>
          </span>
          <Copy className="size-5 text-slate-300" aria-hidden />
        </button>
      )}

      {valendo && (
        <TempoReserva
          inicioEm={reserva.inicioEm}
          fimEm={reserva.fimEm}
          tabela={reserva.tabela}
          fuso={fuso}
        />
      )}

      {aguardando && (
        <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">
            Pague até {formatarHora(new Date(reserva.expiraEm), fuso)} para garantir a vaga.
          </p>
          {reserva.chavePix ? (
            <p>
              Pix para <span className="font-semibold break-all">{reserva.chavePix}</span>, valor{" "}
              {formatarCentavos(reserva.valorCentavos)}. O estacionamento confirma e você recebe um
              aviso.
            </p>
          ) : (
            <p>Fale com o estacionamento para combinar o pagamento.</p>
          )}
        </div>
      )}

      {(aguardando || reserva.status === "confirmada") && (
        <p className="text-xs text-slate-500">{avisoTaxaAdicional(reserva.tabela)}</p>
      )}

      {reserva.status === "cancelada" && reserva.reembolsoCentavos > 0 && (
        <p className="text-sm text-slate-600">
          Reembolso de {formatarCentavos(reserva.reembolsoCentavos)}:{" "}
          {reserva.reembolsada ? "já devolvido." : "aguardando devolução pelo estacionamento."}
        </p>
      )}

      {cancelavel && (
        <Button
          variant="ghost"
          className="w-full text-slate-600"
          disabled={pendente}
          onClick={cancelar}
        >
          <X aria-hidden />
          Cancelar reserva
        </Button>
      )}
    </Card>
  );
}
