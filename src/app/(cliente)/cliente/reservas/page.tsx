import { CalendarX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { CartaoReserva } from "@/features/reservas/components/cartao-reserva";
import { listarReservasDoCliente } from "@/features/reservas/queries";
import { env } from "@/lib/env";
import { exigirCliente } from "@/server/sessao";

export const metadata: Metadata = { title: "Minhas reservas" };

const EM_ANDAMENTO = ["pendente", "confirmada", "em_uso"];

export default async function PaginaReservas() {
  const cliente = await exigirCliente();
  const reservas = await listarReservasDoCliente(cliente.usuarioId);
  const ativas = reservas.filter((r) => EM_ANDAMENTO.includes(r.status)).reverse();
  const historico = reservas.filter((r) => !EM_ANDAMENTO.includes(r.status));

  return (
    <div className="space-y-5">
      <TituloPagina titulo="Minhas reservas">
        <Link href="/cliente/reservar" className={buttonVariants({ variant: "destaque" })}>
          Nova reserva
        </Link>
      </TituloPagina>

      {ativas.length === 0 ? (
        <Card>
          <Vazio
            Icone={CalendarX}
            titulo="Nenhuma reserva em andamento"
            dica="Reserve com antecedência e chegue com a vaga garantida."
          />
        </Card>
      ) : (
        ativas.map((r) => <CartaoReserva key={r.id} reserva={r} fuso={env.APP_TIMEZONE} />)
      )}

      {historico.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display pt-2 text-2xl font-bold">Histórico</h2>
          {historico.map((r) => (
            <CartaoReserva key={r.id} reserva={r} fuso={env.APP_TIMEZONE} />
          ))}
        </section>
      )}
    </div>
  );
}
