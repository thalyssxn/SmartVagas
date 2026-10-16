import { CalendarDays, Car, ChevronRight, MapPin, Ticket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { listarEventosPublicos } from "@/features/eventos/queries";
import { statusAssinatura } from "@/features/mensalistas/status-assinatura";
import { CartaoReserva } from "@/features/reservas/components/cartao-reserva";
import { listarReservasDoCliente } from "@/features/reservas/queries";
import { listarVeiculosDoCliente } from "@/features/veiculos/servico";
import { env } from "@/lib/env";
import { dataParaDia, diaCivil, formatarDataHora, formatarDia } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import { prisma } from "@/server/db";
import { exigirCliente } from "@/server/sessao";

export const metadata: Metadata = { title: "Início" };

export default async function PaginaInicioCliente() {
  const cliente = await exigirCliente();
  const fuso = env.APP_TIMEZONE;
  const [reservas, veiculos, eventos, assinaturas] = await Promise.all([
    listarReservasDoCliente(cliente.usuarioId),
    listarVeiculosDoCliente(cliente.usuarioId),
    listarEventosPublicos(),
    prisma.assinatura.findMany({
      where: { motorista: { userId: cliente.usuarioId }, encerradaEm: null },
      select: {
        id: true,
        venceEm: true,
        plano: { select: { nome: true } },
        motorista: {
          select: {
            estacionamento: {
              select: { nome: true, configuracao: { select: { carenciaMensalidadeDias: true } } },
            },
          },
        },
      },
    }),
  ]);

  const hoje = diaCivil(new Date(), fuso);
  // A reserva que importa agora: em uso, depois a próxima confirmada, depois a que falta pagar.
  const ordem = { em_uso: 0, confirmada: 1, pendente: 2 } as const;
  const destaque = reservas
    .filter((r) => r.status in ordem)
    .sort(
      (a, b) =>
        ordem[a.status as keyof typeof ordem] - ordem[b.status as keyof typeof ordem] ||
        a.inicioEm.localeCompare(b.inicioEm),
    )[0];
  const outras = reservas.filter((r) => r.status in ordem && r.id !== destaque?.id).length;
  const primeiroNome = cliente.nome.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl leading-none font-bold">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-slate-600">
          {destaque ? "Sua próxima vaga está aqui embaixo." : "Para onde vamos hoje?"}
        </p>
      </div>

      {destaque ? (
        <div className="space-y-2">
          <CartaoReserva reserva={destaque} fuso={fuso} />
          {outras > 0 && (
            <Link
              href="/cliente/reservas"
              className="text-primaria flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              Mais {outras} {outras === 1 ? "reserva em andamento" : "reservas em andamento"}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      ) : (
        <Card className="textura-asfalto space-y-4 border-0 text-white">
          <p className="font-display text-3xl leading-tight font-bold">
            Garanta a vaga antes de sair de casa.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/explorar" className={buttonVariants({ variant: "destaque", size: "lg" })}>
              <MapPin aria-hidden />
              Encontrar vaga perto
            </Link>
            <Link
              href="/eventos"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "border-white/25 bg-white/10 text-white hover:bg-white/20",
              )}
            >
              <CalendarDays aria-hidden />
              Ver eventos
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/explorar",
            rotulo: "Encontrar vaga",
            Icone: MapPin,
            detalhe: "Por distância e veículo",
          },
          {
            href: "/cliente/reservas",
            rotulo: "Reservas",
            Icone: Ticket,
            detalhe: `${reservas.length} no histórico`,
          },
          {
            href: "/cliente/veiculos",
            rotulo: "Veículos",
            Icone: Car,
            detalhe: veiculos.length ? veiculos.map((v) => v.placa).join(", ") : "Nenhum ainda",
          },
        ].map(({ href, rotulo, Icone, detalhe }) => (
          <Link key={href} href={href}>
            <Card className="flex h-full items-center gap-3 transition hover:border-slate-400">
              <Icone className="text-primaria size-6 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block font-semibold">{rotulo}</span>
                <span className="block truncate text-sm text-slate-500">{detalhe}</span>
              </span>
            </Card>
          </Link>
        ))}
      </div>

      {assinaturas.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold">Planos mensais</h2>
          {assinaturas.map((a) => {
            const venceEm = dataParaDia(a.venceEm);
            const status = statusAssinatura(
              venceEm,
              hoje,
              a.motorista.estacionamento.configuracao?.carenciaMensalidadeDias ?? 5,
            );
            return (
              <Card key={a.id} className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>{a.plano.nome}</CardTitle>
                  <p className="text-sm text-slate-600">
                    {a.motorista.estacionamento.nome} · {status === "em_dia" ? "vence" : "venceu"}{" "}
                    em {formatarDia(venceEm)}
                  </p>
                </div>
                <Badge
                  variant={
                    status === "em_dia" ? "success" : status === "atrasada" ? "warning" : "danger"
                  }
                >
                  {status === "em_dia" ? "Em dia" : status === "atrasada" ? "Atrasado" : "Suspenso"}
                </Badge>
              </Card>
            );
          })}
        </section>
      )}

      {eventos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-display text-2xl font-bold">Próximos eventos</h2>
            <Link href="/eventos" className="text-primaria text-sm font-semibold hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="space-y-2">
            {eventos.slice(0, 3).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/cliente/reservar?estacionamento=${e.estacionamento.id}&evento=${e.id}`}
                >
                  <Card className="flex items-center gap-3 py-3 transition hover:border-slate-400 sm:py-3">
                    <CalendarDays className="text-faixa-escura size-5 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.nome}</span>
                      <span className="block truncate text-sm text-slate-500">
                        {formatarDataHora(new Date(e.inicioEm), fuso)} · {e.estacionamento.nome}
                      </span>
                    </span>
                    <span className="text-primaria text-sm font-semibold">Reservar</span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
