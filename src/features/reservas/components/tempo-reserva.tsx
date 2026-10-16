"use client";

import { AlarmClock, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { TabelaPreco } from "@/features/estadias/preco";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDuracao, formatarHora } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import { calcularExcedente } from "../excedente";

const ALERTA_MIN = 20;

/**
 * Contagem até o horário de saída da reserva. Passou do horário, mostra a taxa adicional
 * que a saída vai cobrar (mesma tabela do avulso). Atualiza sozinho a cada 30 s.
 */
export function TempoReserva({
  inicioEm,
  fimEm,
  tabela,
  fuso,
}: {
  inicioEm: string;
  fimEm: string;
  tabela: TabelaPreco;
  fuso: string;
}) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fim = new Date(fimEm);
  const { minutosRestantes, minutosExcedidos, taxaCentavos } = calcularExcedente(
    fim,
    agora,
    tabela,
  );

  if (minutosExcedidos > 0) {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-950 ring-1 ring-red-200"
      >
        <TriangleAlert className="text-alerta mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-bold">
            Você passou {formatarDuracao(minutosExcedidos)} do horário ({formatarHora(fim, fuso)}).
          </p>
          <p>
            {taxaCentavos > 0
              ? `Taxa adicional até agora: ${formatarCentavos(taxaCentavos)}, paga na saída.`
              : `Ainda dentro da tolerância de ${tabela.toleranciaMin} min. Depois disso começa a taxa adicional.`}
          </p>
        </div>
      </div>
    );
  }

  const inicio = new Date(inicioEm);
  if (inicio > agora) {
    const ate = Math.ceil((inicio.getTime() - agora.getTime()) / 60_000);
    return (
      <div
        role="status"
        className="bg-concreto flex items-center gap-3 rounded-xl p-3 text-sm text-slate-700"
      >
        <AlarmClock className="size-5 shrink-0 text-slate-500" aria-hidden />
        <p>
          <strong>Chegada a partir de {formatarHora(inicio, fuso)}</strong> (em{" "}
          {formatarDuracao(ate)}) · saída até {formatarHora(fim, fuso)}.
        </p>
      </div>
    );
  }

  const perto = minutosRestantes <= ALERTA_MIN;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 text-sm",
        perto ? "bg-amber-50 text-amber-950 ring-1 ring-amber-300" : "bg-concreto text-slate-700",
      )}
    >
      <AlarmClock
        className={cn("size-5 shrink-0", perto ? "text-faixa-escura" : "text-slate-500")}
        aria-hidden
      />
      <p>
        <strong>Saída até {formatarHora(fim, fuso)}</strong> · faltam{" "}
        {formatarDuracao(minutosRestantes)}.
        {perto &&
          ` Depois disso: ${formatarCentavos(tabela.primeiraHoraCentavos)} na 1ª hora extra.`}
      </p>
    </div>
  );
}
