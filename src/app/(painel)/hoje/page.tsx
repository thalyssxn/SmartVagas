import {
  BellRing,
  CalendarDays,
  CircleCheck,
  CircleSlash,
  Clock,
  Handshake,
  LogIn,
  LogOut,
  Ticket,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AtualizacaoAutomatica } from "@/components/atualizacao-automatica";
import { Indicador } from "@/components/indicador";
import { Placa } from "@/components/placa";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import { ROTULO_FORMA } from "@/features/estadias/formas-pagamento";
import { limitesDoMes } from "@/features/financeiro/periodo";
import { resumoDoDia } from "@/features/painel/queries";
import type { FormaPagamento } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDataHora, formatarDia, formatarDuracao, formatarHora } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import { prisma } from "@/server/db";
import { ehDono, exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Painel do dia" };

const FORMAS: FormaPagamento[] = ["dinheiro", "pix", "cartao"];

export default async function PaginaHoje() {
  const contexto = await exigirEquipe();
  const op = await obterOperacao(contexto.estacionamentoId);
  const dono = ehDono(contexto);
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(op.hoje.slice(0, 7), op.fuso);
  const [resumo, esperando, pagarReservas, eventos, convenioMes] = await Promise.all([
    resumoDoDia(contexto.estacionamentoId, op),
    prisma.alertaVaga.count({
      where: { estacionamentoId: contexto.estacionamentoId, notificadoEm: null },
    }),
    prisma.reserva.count({
      where: {
        estacionamentoId: contexto.estacionamentoId,
        status: "pendente",
        expiraEm: { gt: op.agora },
      },
    }),
    prisma.evento.findMany({
      where: {
        estacionamentoId: contexto.estacionamentoId,
        ativo: true,
        fimEm: { gt: op.agora },
        inicioEm: { lt: new Date(op.agora.getTime() + 7 * 86_400_000) },
      },
      orderBy: { inicioEm: "asc" },
      take: 3,
      select: {
        id: true,
        nome: true,
        local: true,
        inicioEm: true,
        _count: { select: { reservas: true } },
      },
    }),
    prisma.estadia.aggregate({
      where: {
        estacionamentoId: contexto.estacionamentoId,
        convenioId: { not: null },
        saidaEm: { gte: inicioMes, lt: fimMes },
      },
      _sum: { descontoCentavos: true },
      _count: { _all: true },
    }),
  ]);
  const { vagas, receitaAvulsa } = resumo;
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: op.fuso,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(op.agora);
  const primeiroNome = contexto.nome.replace(/\s*\(.*?\)/, "").split(" ")[0];
  const bloqueadas = vagas.total - vagas.ativas;
  const ocupacaoPct = vagas.ativas
    ? Math.round(((vagas.ocupadas + vagas.reservadas) / vagas.ativas) * 100)
    : 0;
  const lotado = vagas.livres === 0;

  const faixas = [
    { chave: "ocupadas", rotulo: "Ocupadas", valor: vagas.ocupadas, classe: "bg-asfalto-2" },
    { chave: "reservadas", rotulo: "Reservadas", valor: vagas.reservadas, classe: "bg-reservada" },
    { chave: "livres", rotulo: "Livres", valor: vagas.livres, classe: "bg-livre" },
    {
      chave: "bloqueadas",
      rotulo: "Bloqueadas",
      valor: bloqueadas,
      classe: "hachura bg-bloqueada",
    },
  ];

  return (
    <div className="space-y-6">
      <AtualizacaoAutomatica />
      <div>
        <h1 className="font-display text-4xl leading-none font-bold tracking-tight">
          Olá, {primeiroNome}
        </h1>
        <p className="mt-1 text-slate-500 first-letter:uppercase">{dia}</p>
      </div>

      {/* A ocupação é o número que o dono quer ver primeiro: barra única, como as vagas lado a lado. */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-600">Ocupação agora</p>
            <p className="font-display text-6xl leading-none font-bold tabular-nums">
              {ocupacaoPct}
              <span className="text-3xl text-slate-400">%</span>
            </p>
          </div>
          <p className="text-right text-slate-600">
            <span
              className={cn(
                "font-display text-4xl font-bold tabular-nums",
                lotado ? "text-alerta" : "text-livre",
              )}
            >
              {vagas.livres}
            </span>{" "}
            livres de {vagas.ativas}
          </p>
        </div>
        <div
          className="bg-concreto flex h-5 w-full overflow-hidden rounded-md"
          role="img"
          aria-label={faixas.map((f) => `${f.rotulo}: ${f.valor}`).join(", ")}
        >
          {faixas.map((f) =>
            f.valor > 0 ? (
              <span
                key={f.chave}
                className={cn("h-full border-r-2 border-white last:border-r-0", f.classe)}
                style={{ width: `${(f.valor / Math.max(1, vagas.total)) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          {faixas.map((f) => (
            <li key={f.chave} className="flex items-center gap-1.5">
              <span className={cn("size-3 rounded-sm", f.classe)} aria-hidden />
              {f.rotulo} <strong className="text-tinta tabular-nums">{f.valor}</strong>
            </li>
          ))}
        </ul>
      </Card>

      {(lotado || esperando > 0 || pagarReservas > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          {lotado && (
            <Link
              href="/patio"
              className="bg-alerta flex items-center gap-3 rounded-xl p-4 font-semibold text-white"
            >
              <CircleSlash className="size-6 shrink-0" aria-hidden />
              Pátio lotado. Motoristas veem &quot;Lotado agora&quot; na busca.
            </Link>
          )}
          {esperando > 0 && (
            <div className="ring-faixa flex items-center gap-3 rounded-xl bg-white p-4 ring-1">
              <BellRing className="text-faixa-escura size-6 shrink-0" aria-hidden />
              <p>
                <strong>{esperando}</strong>{" "}
                {esperando === 1 ? "motorista espera" : "motoristas esperam"} vaga. O aviso sai
                sozinho na próxima saída.
              </p>
            </div>
          )}
          {pagarReservas > 0 && (
            <Link
              href="/reservas"
              className="ring-primaria/40 hover:ring-primaria flex items-center gap-3 rounded-xl bg-white p-4 ring-1"
            >
              <Ticket className="text-primaria size-6 shrink-0" aria-hidden />
              <p>
                <strong>{pagarReservas}</strong>{" "}
                {pagarReservas === 1 ? "reserva aguarda" : "reservas aguardam"} confirmação do Pix.
              </p>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador Icone={LogIn} tom="verde" rotulo="Entradas hoje" valor={resumo.entradas} />
        <Indicador Icone={LogOut} tom="cinza" rotulo="Saídas hoje" valor={resumo.saidas} />
        {/* Operador não vê dinheiro consolidado (docs/MVP_v1.1.md §8). */}
        {dono && (
          <Indicador
            Icone={Wallet}
            tom="ambar"
            rotulo="Receita avulsa hoje"
            valor={formatarCentavos(receitaAvulsa.totalCentavos)}
            detalhe={FORMAS.map(
              (forma) =>
                `${ROTULO_FORMA[forma]} ${formatarCentavos(receitaAvulsa.porForma[forma])}`,
            ).join(" · ")}
          />
        )}
        {dono && (
          <Indicador
            Icone={Handshake}
            rotulo="Convênios no mês"
            valor={formatarCentavos(convenioMes._sum.descontoCentavos ?? 0)}
            detalhe={`${convenioMes._count._all} saídas · a cobrar dos parceiros`}
          />
        )}
      </div>

      {dono && resumo.mensalidadesCentavos > 0 && (
        <p className="text-sm text-slate-600">
          Mensalidades recebidas hoje:{" "}
          <strong>{formatarCentavos(resumo.mensalidadesCentavos)}</strong>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Permanência acima de {op.alertaPermanenciaMin / 60}h</CardTitle>
          {resumo.permanenciaLonga.length === 0 ? (
            <Vazio Icone={CircleCheck} titulo="Nenhum carro passou do limite" />
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {resumo.permanenciaLonga.map((carro) => (
                <li key={carro.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/patio?estadia=${carro.id}`} aria-label={`Dar saída ${carro.placa}`}>
                    <Placa valor={carro.placa} />
                  </Link>
                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Clock className="text-alerta size-4" aria-hidden />
                    Vaga {carro.vaga} · {formatarDuracao(carro.minutos)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Mensalistas com pendência</CardTitle>
          {resumo.mensalistasPendentes.length === 0 ? (
            <Vazio Icone={CircleCheck} titulo="Todos os mensalistas estão em dia" />
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {resumo.mensalistasPendentes.map((m) => (
                <li key={m.assinaturaId} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{m.nome}</span>
                    <span className="text-sm text-slate-500">{m.plano.nome}</span>
                  </span>
                  <Badge variant={m.status === "suspensa" ? "danger" : "warning"}>
                    {m.status === "suspensa" ? "Suspensa" : "Atrasada"} · {formatarDia(m.venceEm)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Eventos nos próximos 7 dias</CardTitle>
          {eventos.length === 0 ? (
            <Vazio Icone={CalendarDays} titulo="Nenhum evento divulgado">
              {dono && (
                <Link
                  href="/agenda"
                  className="text-primaria text-sm font-semibold hover:underline"
                >
                  Divulgar evento
                </Link>
              )}
            </Vazio>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {eventos.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-14 shrink-0 text-center">
                    <span className="block text-xs text-slate-500">
                      {formatarDataHora(e.inicioEm, op.fuso).slice(0, 5)}
                    </span>
                    <span className="font-display text-lg font-bold">
                      {formatarHora(e.inicioEm, op.fuso)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.nome}</span>
                    <span className="block truncate text-sm text-slate-500">
                      {e._count.reservas} reservas · {e.local}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
