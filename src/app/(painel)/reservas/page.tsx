import { CircleCheck, Ticket } from "lucide-react";
import type { Metadata } from "next";
import { AtualizacaoAutomatica } from "@/components/atualizacao-automatica";
import { Card, CardTitle, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import { LinhaReserva } from "@/features/reservas/components/lista-guiche";
import { listarReservasDoGuiche } from "@/features/reservas/queries";
import { paraTela } from "@/features/reservas/status-reserva";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Reservas" };

export default async function PaginaReservas() {
  const contexto = await exigirEquipe();
  const op = await obterOperacao(contexto.estacionamentoId);
  const { aguardando, proximas, reembolsos } = await listarReservasDoGuiche(
    contexto.estacionamentoId,
    op,
  );

  return (
    <div className="space-y-4">
      <AtualizacaoAutomatica />
      <TituloPagina
        titulo="Reservas"
        descricao="Reservas online dos motoristas: confirme o Pix, acompanhe quem chega e devolva reembolsos."
      />

      <Card>
        <CardTitle>Aguardando pagamento ({aguardando.length})</CardTitle>
        <p className="text-sm text-slate-500">
          Confirme depois de ver o Pix na conta. Reserva que passa do prazo expira sozinha e libera
          a vaga.
        </p>
        {aguardando.length === 0 ? (
          <Vazio Icone={CircleCheck} titulo="Nenhuma reserva aguardando pagamento" />
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {aguardando.map((reserva) => (
              <LinhaReserva
                key={reserva.id}
                reserva={paraTela(reserva)}
                fuso={op.fuso}
                modo="aguardando"
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Próximas reservas ({proximas.length})</CardTitle>
        <p className="text-sm text-slate-500">
          Na chegada, digite a placa no Pátio: o sistema leva o carro para a vaga reservada.
        </p>
        {proximas.length === 0 ? (
          <Vazio Icone={Ticket} titulo="Nenhuma reserva paga a caminho" />
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {proximas.map((reserva) => (
              <LinhaReserva
                key={reserva.id}
                reserva={paraTela(reserva)}
                fuso={op.fuso}
                modo="proxima"
              />
            ))}
          </ul>
        )}
      </Card>

      {reembolsos.length > 0 && (
        <Card>
          <CardTitle>Reembolsos a fazer ({reembolsos.length})</CardTitle>
          <p className="text-sm text-slate-500">Devolva o valor por Pix e marque aqui.</p>
          <ul className="mt-2 divide-y divide-slate-100">
            {reembolsos.map((reserva) => (
              <LinhaReserva
                key={reserva.id}
                reserva={paraTela(reserva)}
                fuso={op.fuso}
                modo="reembolso"
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
