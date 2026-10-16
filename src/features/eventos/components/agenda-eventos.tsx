"use client";

import { CalendarX, Clock, MapPin, Navigation, ParkingSquare } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { BarraLocalizacao } from "@/features/explorar/components/barra-localizacao";
import { BotaoAviseMe } from "@/features/explorar/components/botao-avise-me";
import { useLocalizacao } from "@/features/explorar/use-localizacao";
import {
  coordenadasValidas,
  distanciaKm,
  formatarDistancia,
  linkComoChegar,
} from "@/lib/distancia";
import { formatarHora } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import type { EventoPublico } from "../queries";

type Props = {
  eventos: EventoPublico[];
  fuso: string;
  logado: boolean;
  mostrarLocalizacao?: boolean;
};

function chaveDoDia(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function tituloDoDia(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

export function AgendaEventos({ eventos, fuso, logado, mostrarLocalizacao = true }: Props) {
  const loc = useLocalizacao();
  const [categoria, setCategoria] = useState<string>("");
  const categorias = useMemo(
    () =>
      [...new Set(eventos.map((e) => e.categoria).filter((c): c is string => Boolean(c)))].sort(),
    [eventos],
  );

  const dias = useMemo(() => {
    const filtrados = eventos.filter((e) => !categoria || e.categoria === categoria);
    const grupos = new Map<string, (EventoPublico & { distancia: number | null })[]>();
    for (const e of filtrados) {
      const { latitude, longitude } = e.estacionamento;
      const distancia =
        loc.local && coordenadasValidas(latitude, longitude)
          ? distanciaKm(loc.local, { latitude: latitude!, longitude: longitude! })
          : null;
      const chave = chaveDoDia(e.inicioEm, fuso);
      grupos.set(chave, [...(grupos.get(chave) ?? []), { ...e, distancia }]);
    }
    return [...grupos];
  }, [eventos, categoria, fuso, loc.local]);

  return (
    <div className="space-y-6">
      {mostrarLocalizacao && <BarraLocalizacao loc={loc} />}

      {categorias.length > 0 && (
        <div role="group" aria-label="Categoria" className="flex flex-wrap gap-1.5">
          {["", ...categorias].map((c) => (
            <button
              key={c || "todas"}
              type="button"
              aria-pressed={categoria === c}
              onClick={() => setCategoria(c)}
              className={cn(
                "h-10 rounded-full border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:border-slate-400",
                categoria === c && "border-asfalto bg-asfalto hover:border-asfalto text-white",
              )}
            >
              {c || "Todos"}
            </button>
          ))}
        </div>
      )}

      {dias.length === 0 ? (
        <Card>
          <Vazio
            Icone={CalendarX}
            titulo="Nenhum evento na agenda"
            dica="Quando um estacionamento parceiro divulgar um evento, ele aparece aqui."
          />
        </Card>
      ) : (
        dias.map(([dia, lista]) => (
          <section key={dia} className="space-y-3">
            <h2 className="font-display text-2xl font-bold first-letter:uppercase">
              {tituloDoDia(lista[0].inicioEm, fuso)}
            </h2>
            <ul className="space-y-3">
              {lista.map((e) => {
                const reservarHref = `/cliente/reservar?estacionamento=${e.estacionamento.id}&evento=${e.id}`;
                const esgotado = e.vagasParaReserva === 0;
                return (
                  <li key={e.id}>
                    <Card className="grid gap-4 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center">
                      {/* Bloco de horário em asfalto, como a placa de horário de um evento. */}
                      <div className="textura-asfalto flex items-center gap-3 rounded-xl p-3 text-white sm:flex-col sm:gap-0 sm:text-center">
                        <span className="font-display text-3xl leading-none font-bold">
                          {formatarHora(new Date(e.inicioEm), fuso)}
                        </span>
                        <span className="text-xs text-slate-300">
                          até {formatarHora(new Date(e.fimEm), fuso)}
                        </span>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.categoria && (
                            <span className="bg-faixa text-tinta rounded-md px-2 py-0.5 text-xs font-bold">
                              {e.categoria}
                            </span>
                          )}
                          {e.distancia !== null && (
                            <span className="text-xs font-semibold text-slate-500">
                              {formatarDistancia(e.distancia)} de você
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl leading-tight font-bold">{e.nome}</h3>
                        <p className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="size-4 shrink-0" aria-hidden />
                          {e.local}
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-slate-600">
                          <ParkingSquare className="size-4 shrink-0" aria-hidden />
                          <Link
                            href={`/estacionamentos/${e.estacionamento.id}`}
                            className="text-tinta font-semibold hover:underline"
                          >
                            {e.estacionamento.nome}
                          </Link>
                        </p>
                        {e.descricao && <p className="text-sm text-slate-500">{e.descricao}</p>}
                      </div>
                      <div className="flex flex-col gap-2 sm:w-52">
                        <p
                          className={cn(
                            "flex items-center gap-1.5 text-sm font-semibold",
                            esgotado ? "text-alerta" : "text-livre",
                          )}
                        >
                          <Clock className="size-4" aria-hidden />
                          {esgotado
                            ? "Reservas esgotadas"
                            : `${e.vagasParaReserva} ${e.vagasParaReserva === 1 ? "vaga para reservar" : "vagas para reservar"}`}
                        </p>
                        {esgotado ? (
                          <BotaoAviseMe estacionamentoId={e.estacionamento.id} logado={logado} />
                        ) : (
                          <Link
                            href={
                              logado
                                ? reservarHref
                                : `/login?voltar=${encodeURIComponent(reservarHref)}`
                            }
                            className={buttonVariants({ variant: "destaque" })}
                          >
                            Reservar para o evento
                          </Link>
                        )}
                        <a
                          href={linkComoChegar(
                            coordenadasValidas(
                              e.estacionamento.latitude,
                              e.estacionamento.longitude,
                            )
                              ? {
                                  latitude: e.estacionamento.latitude!,
                                  longitude: e.estacionamento.longitude!,
                                }
                              : null,
                            e.estacionamento.endereco,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          <Navigation aria-hidden />
                          Como chegar ao estacionamento
                        </a>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
