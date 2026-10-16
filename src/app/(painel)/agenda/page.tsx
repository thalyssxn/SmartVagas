import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardTitle, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import {
  AlternarEvento,
  NovoEvento,
  SeloVisibilidade,
} from "@/features/eventos/components/gestao-eventos";
import { listarEventosDoEstacionamento } from "@/features/eventos/queries";
import { formatarDataHora, formatarHora, paraHorarioLocal } from "@/lib/tempo";
import { prisma } from "@/server/db";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Eventos" };

export default async function PaginaAgenda() {
  const contexto = await exigirEquipe(["dono"]);
  const op = await obterOperacao(contexto.estacionamentoId);
  const [{ proximos, passados }, reservaveis] = await Promise.all([
    listarEventosDoEstacionamento(contexto.estacionamentoId),
    prisma.vaga.count({
      where: { estacionamentoId: contexto.estacionamentoId, ativa: true, reservavel: true },
    }),
  ]);
  const amanha19h = new Date(op.agora.getTime() + 86_400_000);
  const inicioPadrao = paraHorarioLocal(amanha19h, op.fuso).slice(0, 11) + "19:00";
  const fimPadrao = paraHorarioLocal(amanha19h, op.fuso).slice(0, 11) + "23:00";

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo="Eventos"
        descricao="Divulgue shows, jogos e feiras perto do seu estacionamento. Eles aparecem na agenda pública com o botão de reservar vaga."
      >
        <NovoEvento inicioPadrao={inicioPadrao} fimPadrao={fimPadrao} />
      </TituloPagina>

      {reservaveis === 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
          Nenhuma vaga está liberada para reserva, então o evento aparece como esgotado.{" "}
          <Link href="/configuracoes#vagas" className="font-semibold underline">
            Liberar vagas para reserva
          </Link>
        </p>
      )}

      <Card>
        <CardTitle>Próximos ({proximos.length})</CardTitle>
        {proximos.length === 0 ? (
          <Vazio
            Icone={CalendarDays}
            titulo="Nenhum evento divulgado"
            dica="Evento grande perto daqui? Divulgue e venda as vagas antes."
          />
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {proximos.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="textura-asfalto w-24 shrink-0 rounded-lg p-2 text-center text-white">
                  <p className="text-xs text-slate-300">
                    {formatarDataHora(e.inicioEm, op.fuso).slice(0, 5)}
                  </p>
                  <p className="font-display text-2xl leading-none font-bold">
                    {formatarHora(e.inicioEm, op.fuso)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {e.nome}
                    <SeloVisibilidade ativo={e.ativo} />
                    {e.categoria && (
                      <span className="text-faixa-escura text-xs font-semibold">{e.categoria}</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600">
                    {e.local} · até {formatarDataHora(e.fimEm, op.fuso)}
                  </p>
                </div>
                <p className="text-right text-sm">
                  <span className="font-display text-2xl font-bold tabular-nums">
                    {e._count.reservas}
                  </span>
                  <span className="block text-slate-500">reservas pagas</span>
                </p>
                <AlternarEvento id={e.id} ativo={e.ativo} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {passados.length > 0 && (
        <Card>
          <CardTitle>Já aconteceram</CardTitle>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {passados.map((e) => (
              <li key={e.id} className="flex justify-between gap-2 py-2">
                <span>
                  <strong>{e.nome}</strong>{" "}
                  <span className="text-slate-500">· {formatarDataHora(e.inicioEm, op.fuso)}</span>
                </span>
                <span className="text-slate-600">{e._count.reservas} reservas</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
