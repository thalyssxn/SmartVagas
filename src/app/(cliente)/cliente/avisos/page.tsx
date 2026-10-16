import {
  Bell,
  BellRing,
  CalendarCheck,
  CircleCheck,
  Clock,
  ParkingSquare,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardTitle, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { BotaoCancelarAlerta } from "@/features/avisos/components/botao-cancelar-alerta";
import { alertasPendentes, listarAvisos, marcarAvisosLidos } from "@/features/avisos/servico";
import { env } from "@/lib/env";
import { formatarDataHora } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import { exigirCliente } from "@/server/sessao";

export const metadata: Metadata = { title: "Avisos" };

const ICONE: Record<string, LucideIcon> = {
  vaga_liberada: ParkingSquare,
  reserva_confirmada: CalendarCheck,
  reserva_cancelada: X,
  tempo_acabando: Clock,
};

export default async function PaginaAvisos() {
  const cliente = await exigirCliente();
  const [avisos, alertas] = await Promise.all([
    listarAvisos(cliente.usuarioId),
    alertasPendentes(cliente.usuarioId),
  ]);
  // Abriu a central: tudo o que estava aqui conta como lido na próxima visita.
  await marcarAvisosLidos(cliente.usuarioId);

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Avisos"
        descricao="Vaga liberada, pagamento confirmado e horário da reserva acabando."
      />

      {alertas.length > 0 && (
        <Card className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="text-faixa-escura size-5" aria-hidden />
            Esperando vaga
          </CardTitle>
          <ul className="divide-y divide-slate-100">
            {alertas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm">
                  <Link
                    href={`/estacionamentos/${a.estacionamento.id}`}
                    className="font-semibold hover:underline"
                  >
                    {a.estacionamento.nome}
                  </Link>
                  <span className="text-slate-500"> · avisamos na próxima vaga livre</span>
                </span>
                <BotaoCancelarAlerta alertaId={a.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        {avisos.length === 0 ? (
          <Vazio
            Icone={Bell}
            titulo="Nenhum aviso por enquanto"
            dica="Quando sua reserva for confirmada ou abrir vaga onde você pediu, aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {avisos.map((a) => {
              const Icone = ICONE[a.tipo] ?? CircleCheck;
              const conteudo = (
                <div className="flex gap-3 py-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full",
                      a.lidaEm ? "bg-concreto text-slate-500" : "bg-faixa text-tinta",
                    )}
                  >
                    <Icone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className={cn("font-semibold", !a.lidaEm && "text-tinta")}>
                        {a.titulo}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatarDataHora(a.criadaEm, env.APP_TIMEZONE)}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">{a.mensagem}</p>
                  </div>
                </div>
              );
              return (
                <li key={a.id}>
                  {a.link ? (
                    <Link href={a.link} className="hover:bg-concreto/60 block rounded-lg">
                      {conteudo}
                    </Link>
                  ) : (
                    conteudo
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
