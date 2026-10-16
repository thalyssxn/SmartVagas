import {
  Accessibility,
  Bike,
  Car,
  Clock,
  Info,
  Navigation,
  Phone,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtualizacaoAutomatica } from "@/components/atualizacao-automatica";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AgendaEventos } from "@/features/eventos/components/agenda-eventos";
import { listarEventosPublicos } from "@/features/eventos/queries";
import { BotaoAviseMe } from "@/features/explorar/components/botao-avise-me";
import { DistanciaAte } from "@/features/explorar/components/distancia-ate";
import { SeloLotacao } from "@/features/explorar/components/selo-lotacao";
import { obterEstacionamentoPublico } from "@/features/explorar/queries";
import { avisoTaxaAdicional } from "@/features/reservas/excedente";
import type { TipoVaga } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import { coordenadasValidas, linkComoChegar } from "@/lib/distancia";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { obterSessao } from "@/server/sessao";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/estacionamentos/[id]">): Promise<Metadata> {
  const e = await obterEstacionamentoPublico((await params).id);
  return { title: e?.nome ?? "Estacionamento" };
}

const ESPECIAIS: { tipo: TipoVaga; rotulo: string; Icone: LucideIcon }[] = [
  { tipo: "pcd", rotulo: "PCD", Icone: Accessibility },
  { tipo: "idoso", rotulo: "Idoso", Icone: Accessibility },
  { tipo: "eletrica", rotulo: "Recarga elétrica", Icone: Zap },
];

export default async function PaginaEstacionamento({ params }: PageProps<"/estacionamentos/[id]">) {
  const { id } = await params;
  const [e, sessao] = await Promise.all([obterEstacionamentoPublico(id), obterSessao()]);
  if (!e) notFound();
  const eventos = await listarEventosPublicos({ estacionamentoId: e.id });
  const logado = sessao?.user.papel === "motorista";
  const reservarHref = `/cliente/reservar?estacionamento=${e.id}`;
  const destino = coordenadasValidas(e.latitude, e.longitude)
    ? { latitude: e.latitude!, longitude: e.longitude! }
    : null;

  const porVeiculo: { chave: "carro" | "moto" | "grande"; rotulo: string; Icone: LucideIcon }[] = [
    { chave: "carro", rotulo: "Carro", Icone: Car },
    { chave: "moto", rotulo: "Moto", Icone: Bike },
    { chave: "grande", rotulo: "Caminhonete / SUV", Icone: Truck },
  ];

  return (
    <div className="space-y-6">
      <AtualizacaoAutomatica />
      <section className="textura-asfalto relative overflow-hidden rounded-[var(--radius-superficie)] p-5 text-white sm:p-8">
        <div className="linhas-vaga pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <SeloLotacao lotacao={e.lotacao} />
            {e.cidade && <span>{e.cidade}</span>}
            <DistanciaAte latitude={e.latitude} longitude={e.longitude} />
          </div>
          <div>
            <h1 className="font-display text-4xl leading-none font-bold tracking-tight sm:text-5xl">
              {e.nome}
            </h1>
            <p className="mt-2 text-slate-300">{e.endereco}</p>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <p>
              <span className="font-display text-6xl leading-none font-bold tabular-nums">
                {e.livres}
              </span>
              <span className="ml-1 text-lg text-slate-300">de {e.total} vagas livres agora</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {e.aceitaReserva && (
              <Link
                href={logado ? reservarHref : `/login?voltar=${encodeURIComponent(reservarHref)}`}
                className={buttonVariants({ variant: "destaque", size: "lg" })}
              >
                Reservar vaga
              </Link>
            )}
            {e.lotacao === "lotado" && (
              <BotaoAviseMe estacionamentoId={e.id} logado={logado} variant="secondary" />
            )}
            <a
              href={linkComoChegar(destino, `${e.endereco} ${e.cidade ?? ""}`)}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "border-white/25 bg-white/10 text-white hover:bg-white/20",
              )}
            >
              <Navigation aria-hidden />
              Como chegar
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="space-y-4">
          <CardTitle>Vagas por tipo de veículo</CardTitle>
          <ul className="grid gap-3 sm:grid-cols-3">
            {porVeiculo.map(({ chave, rotulo, Icone }) => {
              const livres = e.livresPorVeiculo[chave];
              const total = e.totalPorVeiculo[chave];
              return (
                <li key={chave} className="bg-concreto rounded-xl p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <Icone className="size-4" aria-hidden />
                    {rotulo}
                  </p>
                  {total === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">Não atende</p>
                  ) : (
                    <p
                      className={cn(
                        "font-display text-3xl font-bold tabular-nums",
                        livres === 0 && "text-alerta",
                      )}
                    >
                      {livres}
                      <span className="text-base font-semibold text-slate-400">/{total}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {ESPECIAIS.map(({ tipo, rotulo, Icone }) => (
              <li key={tipo} className="flex items-center gap-1.5">
                <Icone className="size-4" aria-hidden />
                {rotulo}: {e.livresPorTipo[tipo] ?? 0} livre(s)
              </li>
            ))}
          </ul>
          {e.descricao && <p className="text-slate-700">{e.descricao}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {e.horario && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {e.horario}
              </span>
            )}
            {e.telefone && (
              <a
                href={`tel:${e.telefone.replace(/\D/g, "")}`}
                className="hover:text-tinta flex items-center gap-1.5"
              >
                <Phone className="size-4" aria-hidden />
                {e.telefone}
              </a>
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Preços</CardTitle>
          <dl className="divide-y divide-slate-100">
            {[
              ["Primeira hora", formatarCentavos(e.precos.primeiraHoraCentavos)],
              ["Hora adicional", formatarCentavos(e.precos.horaAdicionalCentavos)],
              ["Diária (24 h)", formatarCentavos(e.precos.diariaCentavos)],
              ["Tolerância", `${e.precos.toleranciaMin} min grátis`],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex justify-between py-2">
                <dt className="text-slate-600">{rotulo}</dt>
                <dd className="font-semibold tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {avisoTaxaAdicional(e.precos)}
          </p>
        </Card>
      </div>

      {eventos.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-3xl font-bold">Eventos com este estacionamento</h2>
          <AgendaEventos
            eventos={eventos}
            fuso={env.APP_TIMEZONE}
            logado={logado}
            mostrarLocalizacao={false}
          />
        </section>
      )}
    </div>
  );
}
