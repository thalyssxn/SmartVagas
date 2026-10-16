"use client";

import {
  Bike,
  CalendarDays,
  Car,
  Navigation,
  SearchX,
  Truck,
  Umbrella,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Vazio } from "@/components/vazio";
import type { TipoVeiculo } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import {
  coordenadasValidas,
  distanciaKm,
  formatarDistancia,
  linkComoChegar,
} from "@/lib/distancia";
import { formatarDataHora } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import { lotacao as calcularLotacao } from "@/lib/veiculo";
import type { EstacionamentoPublico } from "../queries";
import { useLocalizacao } from "../use-localizacao";
import { BarraLocalizacao } from "./barra-localizacao";
import { BotaoAviseMe } from "./botao-avise-me";
import { SeloLotacao } from "./selo-lotacao";

type FiltroVeiculo = TipoVeiculo | "todos";

const VEICULOS: { valor: FiltroVeiculo; rotulo: string; Icone?: LucideIcon }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "carro", rotulo: "Carro", Icone: Car },
  { valor: "moto", rotulo: "Moto", Icone: Bike },
  { valor: "grande", rotulo: "Caminhonete / SUV", Icone: Truck },
];

type Props = {
  estacionamentos: EstacionamentoPublico[];
  cidades: string[];
  logado: boolean;
  fuso: string;
};

export function Explorar({ estacionamentos, cidades, logado, fuso }: Props) {
  const loc = useLocalizacao();
  const [veiculo, setVeiculo] = useState<FiltroVeiculo>("todos");
  const [cidade, setCidade] = useState("");
  const [soComVaga, setSoComVaga] = useState(false);
  const [soReserva, setSoReserva] = useState(false);

  const lista = useMemo(() => {
    return estacionamentos
      .map((e) => {
        const livres = veiculo === "todos" ? e.livres : e.livresPorVeiculo[veiculo];
        const total = veiculo === "todos" ? e.total : e.totalPorVeiculo[veiculo];
        const distancia =
          loc.local && coordenadasValidas(e.latitude, e.longitude)
            ? distanciaKm(loc.local, { latitude: e.latitude!, longitude: e.longitude! })
            : null;
        return {
          ...e,
          livresFiltro: livres,
          totalFiltro: total,
          lotacaoFiltro: calcularLotacao(livres, total),
          distancia,
        };
      })
      .filter((e) => veiculo === "todos" || e.totalFiltro > 0)
      .filter((e) => !cidade || e.cidade === cidade)
      .filter((e) => !soComVaga || e.livresFiltro > 0)
      .filter((e) => !soReserva || e.aceitaReserva)
      .sort((a, b) => {
        if (a.distancia !== null && b.distancia !== null) return a.distancia - b.distancia;
        if (a.distancia !== null) return -1;
        if (b.distancia !== null) return 1;
        return b.livresFiltro - a.livresFiltro;
      });
  }, [estacionamentos, veiculo, cidade, soComVaga, soReserva, loc.local]);

  const lotados = lista.filter((e) => e.lotacaoFiltro === "lotado").length;

  return (
    <div className="space-y-5">
      <BarraLocalizacao loc={loc} />

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Tipo de veículo" className="flex flex-wrap gap-1.5">
          {VEICULOS.map(({ valor, rotulo, Icone }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={veiculo === valor}
              onClick={() => setVeiculo(valor)}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400",
                veiculo === valor && "border-asfalto bg-asfalto hover:border-asfalto text-white",
              )}
            >
              {Icone && <Icone className="size-4" aria-hidden />}
              {rotulo}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {cidades.length > 1 && (
          <Select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            aria-label="Cidade"
            className="h-10 w-auto"
          >
            <option value="">Todas as cidades</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-primaria size-5"
            checked={soComVaga}
            onChange={(e) => setSoComVaga(e.target.checked)}
          />
          Só com vaga livre agora
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-primaria size-5"
            checked={soReserva}
            onChange={(e) => setSoReserva(e.target.checked)}
          />
          Aceita reserva online
        </label>
      </div>

      {lotados > 0 && lotados === lista.length && (
        <p
          role="status"
          className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-900 ring-1 ring-red-200"
        >
          Todos os estacionamentos desta busca estão lotados agora. Peça para ser avisado quando
          abrir vaga.
        </p>
      )}

      {lista.length === 0 ? (
        <Card>
          <Vazio
            Icone={SearchX}
            titulo="Nenhum estacionamento com esses filtros"
            dica="Tire um filtro ou escolha outra cidade."
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {lista.map((e) => (
            <li key={e.id}>
              <Card className="flex h-full flex-col gap-3 p-0 sm:p-0">
                <div className="flex gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeloLotacao lotacao={e.lotacaoFiltro} />
                      {e.aceitaReserva && (
                        <span className="bg-primaria-clara text-primaria-escura rounded-md px-2 py-0.5 text-xs font-bold">
                          Reserva online
                        </span>
                      )}
                      {e.coberto && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <Umbrella className="size-3.5" aria-hidden />
                          Coberto
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-xl leading-tight font-bold">
                      <Link href={`/estacionamentos/${e.id}`} className="hover:underline">
                        {e.nome}
                      </Link>
                    </h2>
                    <p className="truncate text-sm text-slate-600">
                      {e.endereco}
                      {e.cidade && !e.endereco.includes(e.cidade) && `, ${e.cidade}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {e.distancia !== null ? (
                      <>
                        <p className="font-display text-3xl leading-none font-bold tabular-nums">
                          {formatarDistancia(e.distancia)}
                        </p>
                        <p className="text-xs text-slate-500">de você</p>
                      </>
                    ) : (
                      <p className="max-w-24 text-xs text-slate-400">
                        Informe onde você está para ver a distância
                      </p>
                    )}
                  </div>
                </div>

                <dl className="bg-concreto mx-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl py-2.5 text-center sm:mx-5">
                  <div>
                    <dt className="text-xs text-slate-500">
                      Livres {veiculo !== "todos" && "p/ você"}
                    </dt>
                    <dd
                      className={cn(
                        "font-display text-2xl font-bold tabular-nums",
                        e.livresFiltro === 0 && "text-alerta",
                      )}
                    >
                      {e.livresFiltro}
                      <span className="text-sm font-semibold text-slate-400">/{e.totalFiltro}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">1ª hora</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums">
                      {formatarCentavos(e.precos.primeiraHoraCentavos)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Diária</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums">
                      {formatarCentavos(e.precos.diariaCentavos)}
                    </dd>
                  </div>
                </dl>

                <p className="flex flex-wrap gap-x-3 gap-y-1 px-4 text-xs text-slate-600 sm:px-5">
                  <span className="flex items-center gap-1">
                    <Car className="size-3.5" aria-hidden /> {e.livresPorVeiculo.carro} carro
                  </span>
                  <span className="flex items-center gap-1">
                    <Bike className="size-3.5" aria-hidden /> {e.livresPorVeiculo.moto} moto
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="size-3.5" aria-hidden /> {e.livresPorVeiculo.grande}{" "}
                    caminhonete/SUV
                  </span>
                </p>

                {e.proximoEvento && (
                  <p className="border-faixa/60 bg-faixa/10 mx-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:mx-5">
                    <CalendarDays className="text-faixa-escura size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">
                      <strong>{e.proximoEvento.nome}</strong> ·{" "}
                      {formatarDataHora(new Date(e.proximoEvento.inicioEm), fuso)}
                    </span>
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 p-4 sm:px-5">
                  {e.lotacaoFiltro === "lotado" ? (
                    <BotaoAviseMe
                      estacionamentoId={e.id}
                      logado={logado}
                      variant="destaque"
                      className="flex-1"
                    />
                  ) : (
                    <Link
                      href={`/estacionamentos/${e.id}`}
                      className={cn(buttonVariants({ variant: "primary" }), "flex-1")}
                    >
                      Ver vagas e reservar
                    </Link>
                  )}
                  <a
                    href={linkComoChegar(
                      coordenadasValidas(e.latitude, e.longitude)
                        ? { latitude: e.latitude!, longitude: e.longitude! }
                        : null,
                      `${e.endereco} ${e.cidade ?? ""}`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    <Navigation aria-hidden />
                    Como chegar
                  </a>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
