"use client";

import { Check, HandCoins, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Placa } from "@/components/placa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDataHora, formatarHora } from "@/lib/tempo";
import {
  cancelarReservaNoGuicheAction,
  confirmarPagamentoAction,
  marcarReembolsadaAction,
} from "../actions";
import { ROTULO_STATUS_RESERVA, type ReservaParaTela } from "../status-reserva";

type Modo = "aguardando" | "proxima" | "reembolso";

export function LinhaReserva({ reserva, fuso, modo }: { reserva: ReservaParaTela; fuso: string; modo: Modo }) {
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<{ ok: true } | { ok: false; erro: { mensagem: string } }>, sucesso: string) {
    iniciar(async () => {
      const resultado = await acao();
      if (resultado.ok) toast.success(sucesso);
      else toast.error(resultado.erro.mensagem);
    });
  }

  function cancelar() {
    if (!window.confirm(`Cancelar a reserva ${reserva.codigo} de ${reserva.nome}?`)) return;
    executar(() => cancelarReservaNoGuicheAction(reserva.id), "Reserva cancelada.");
  }

  const { rotulo, variant } = ROTULO_STATUS_RESERVA[reserva.status];

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <Placa valor={reserva.placa} />
          <span className="font-mono text-sm font-semibold tracking-widest text-slate-500">{reserva.codigo}</span>
        </p>
        <p className="text-sm text-slate-600">
          {reserva.nome} · vaga {reserva.vaga} · {formatarDataHora(new Date(reserva.inicioEm), fuso)} →{" "}
          {formatarHora(new Date(reserva.fimEm), fuso)}
        </p>
        {modo === "aguardando" && (
          <p className="text-xs text-amber-800">
            Expira às {formatarHora(new Date(reserva.expiraEm), fuso)}
          </p>
        )}
      </div>

      <span className="w-20 text-right font-semibold tabular-nums">
        {formatarCentavos(modo === "reembolso" ? reserva.reembolsoCentavos : reserva.valorCentavos)}
      </span>

      {modo === "proxima" && <Badge variant={variant}>{rotulo}</Badge>}

      {modo === "aguardando" && (
        <>
          <Button
            disabled={pendente}
            onClick={() =>
              executar(() => confirmarPagamentoAction(reserva.id), `Pagamento de ${reserva.codigo} confirmado.`)
            }
          >
            <Check aria-hidden />
            Confirmar pagamento
          </Button>
          <Button variant="ghost" size="icon" disabled={pendente} onClick={cancelar} aria-label="Cancelar reserva">
            <X aria-hidden />
          </Button>
        </>
      )}

      {modo === "proxima" && reserva.status === "confirmada" && (
        <Button variant="ghost" size="icon" disabled={pendente} onClick={cancelar} aria-label="Cancelar reserva">
          <X aria-hidden />
        </Button>
      )}

      {modo === "reembolso" && (
        <Button
          variant="secondary"
          disabled={pendente}
          onClick={() => executar(() => marcarReembolsadaAction(reserva.id), "Reembolso registrado.")}
        >
          <HandCoins aria-hidden />
          Já devolvi
        </Button>
      )}
    </li>
  );
}
