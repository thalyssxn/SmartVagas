import {
  BellRing,
  Bike,
  Building2,
  CalendarDays,
  Car,
  ChartNoAxesCombined,
  Handshake,
  MapPin,
  ScanLine,
  Timer,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CenaPatio } from "@/components/cena-patio";
import { MolduraSite } from "@/components/site/moldura-site";
import { buttonVariants } from "@/components/ui/button";
import { listarEventosPublicos } from "@/features/eventos/queries";
import { listarEstacionamentosPublicos } from "@/features/explorar/queries";
import { env } from "@/lib/env";
import { formatarDataHora } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import { obterSessao } from "@/server/sessao";

export const dynamic = "force-dynamic";

const MOTORISTA: { Icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    Icone: MapPin,
    titulo: "Vagas perto de você",
    texto: "Veja a distância em km e quantas vagas estão livres agora em cada estacionamento.",
  },
  {
    Icone: Bike,
    titulo: "Filtro por veículo",
    texto: "Carro, moto ou caminhonete: só aparece onde o seu veículo cabe.",
  },
  {
    Icone: CalendarDays,
    titulo: "Eventos da cidade",
    texto: "Show, jogo ou feira: reserve a vaga para o horário do evento.",
  },
  {
    Icone: Timer,
    titulo: "Aviso de horário",
    texto: "Você sabe antes quanto custa passar do tempo, e o app avisa quando está acabando.",
  },
  {
    Icone: BellRing,
    titulo: "Avise-me",
    texto: "Lotou? Peça para ser avisado quando abrir uma vaga.",
  },
];

const ESTACIONAMENTO: { Icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    Icone: ScanLine,
    titulo: "Entrada e saída pela placa",
    texto: "Placa, Enter, Enter. Menos de 15 segundos no guichê.",
  },
  {
    Icone: Handshake,
    titulo: "Convênios",
    texto: "Lojas, shoppings e eventos parceiros com desconto na saída e relatório para cobrar.",
  },
  {
    Icone: ChartNoAxesCombined,
    titulo: "Lucro de verdade",
    texto: "Receita menos salários, encargos e contas, com caixa por turno conferido às cegas.",
  },
];

export default async function PaginaInicial() {
  const sessao = await obterSessao();
  if (sessao) redirect("/inicio");

  const [estacionamentos, eventos] = await Promise.all([
    listarEstacionamentosPublicos(),
    listarEventosPublicos(),
  ]);
  const livres = estacionamentos.reduce((soma, e) => soma + e.livres, 0);
  const cidades = [...new Set(estacionamentos.map((e) => e.cidade).filter(Boolean))];

  return (
    <MolduraSite usuario={{ tipo: "visitante" }} largura="max-w-none px-0 py-0 sm:py-0">
      <section className="textura-asfalto relative overflow-hidden text-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-6">
            <h1 className="font-display text-5xl leading-[0.98] font-bold tracking-tight sm:text-6xl">
              Sua vaga garantida antes de sair de casa.
            </h1>
            <p className="max-w-md text-lg text-slate-300">
              {estacionamentos.length > 0
                ? `Agora mesmo há ${livres} ${livres === 1 ? "vaga livre" : "vagas livres"} em ${estacionamentos.length} ${estacionamentos.length === 1 ? "estacionamento" : "estacionamentos"}${cidades.length ? ` de ${cidades.join(", ")}` : ""}.`
                : "Encontre estacionamento perto de você, reserve e pague pelo celular."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/explorar"
                className={buttonVariants({ variant: "destaque", size: "lg" })}
              >
                <MapPin aria-hidden />
                Encontrar vaga
              </Link>
              <Link
                href="/cadastro/parceiro"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "border-white/25 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                <Building2 aria-hidden />
                Tenho um estacionamento
              </Link>
            </div>
          </div>
          <CenaPatio className="mx-auto max-w-lg" rotulo="Reservada" />
        </div>
        <div className="faixa-tracejada h-1.5 w-full" aria-hidden />
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-2">
        <div className="space-y-5">
          <h2 className="font-display flex items-center gap-2 text-3xl font-bold">
            <Car className="text-primaria size-7" aria-hidden />
            Para quem dirige
          </h2>
          <ul className="space-y-4">
            {MOTORISTA.map(({ Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-3">
                <Icone className="text-primaria mt-0.5 size-5 shrink-0" aria-hidden />
                <p>
                  <strong className="font-semibold">{titulo}.</strong>{" "}
                  <span className="text-slate-600">{texto}</span>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/cadastro" className={buttonVariants({ variant: "primary" })}>
            Criar conta de motorista
          </Link>
        </div>
        <div className="space-y-5">
          <h2 className="font-display flex items-center gap-2 text-3xl font-bold">
            <Building2 className="text-primaria size-7" aria-hidden />
            Para quem tem estacionamento
          </h2>
          <ul className="space-y-4">
            {ESTACIONAMENTO.map(({ Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-3">
                <Icone className="text-primaria mt-0.5 size-5 shrink-0" aria-hidden />
                <p>
                  <strong className="font-semibold">{titulo}.</strong>{" "}
                  <span className="text-slate-600">{texto}</span>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/cadastro/parceiro" className={buttonVariants({ variant: "escuro" })}>
            Cadastrar meu estacionamento
          </Link>
        </div>
      </section>

      {eventos.length > 0 && (
        <section className="border-t border-slate-900/8 bg-white">
          <div className="mx-auto max-w-5xl space-y-5 px-4 py-12">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-3xl font-bold">Próximos eventos com vaga</h2>
              <Link href="/eventos" className="text-primaria font-semibold hover:underline">
                Ver agenda completa
              </Link>
            </div>
            <ul className="grid gap-3 md:grid-cols-3">
              {eventos.slice(0, 3).map((e) => (
                <li
                  key={e.id}
                  className="rounded-[var(--radius-superficie)] border border-slate-900/10 p-4"
                >
                  <p className="text-faixa-escura text-sm font-semibold">
                    {formatarDataHora(new Date(e.inicioEm), env.APP_TIMEZONE)}
                  </p>
                  <p className="mt-1 text-lg leading-tight font-bold">{e.nome}</p>
                  <p className="text-sm text-slate-600">{e.local}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Estacione em <strong className="text-tinta">{e.estacionamento.nome}</strong>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </MolduraSite>
  );
}
