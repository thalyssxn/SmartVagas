import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { obterOperacao } from "@/features/configuracao/queries";
import { Custos } from "@/features/financeiro/components/custos";
import { Equipe } from "@/features/financeiro/components/equipe";
import {
  competenciaValida,
  deslocarCompetencia,
  limitesDoMes,
  nomeDoMes,
} from "@/features/financeiro/periodo";
import { listarFuncionarios, resumoFinanceiro } from "@/features/financeiro/queries";
import { formatarCentavos } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";
import { prisma } from "@/server/db";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Financeiro" };

export default async function PaginaFinanceiro({ searchParams }: PageProps<"/financeiro">) {
  const contexto = await exigirEquipe(["dono"]);
  const op = await obterOperacao(contexto.estacionamentoId);
  const { mes } = await searchParams;
  const atual = op.hoje.slice(0, 7);
  const competencia = typeof mes === "string" && competenciaValida(mes) ? mes : atual;

  const { inicio, fim } = limitesDoMes(competencia, op.fuso);
  const [resumo, funcionarios, convenios] = await Promise.all([
    resumoFinanceiro(contexto.estacionamentoId, competencia, op.fuso),
    listarFuncionarios(contexto.estacionamentoId),
    prisma.estadia.aggregate({
      where: {
        estacionamentoId: contexto.estacionamentoId,
        convenioId: { not: null },
        saidaEm: { gte: inicio, lt: fim },
      },
      _sum: { descontoCentavos: true },
    }),
  ]);
  const aReceberConvenios = convenios._sum.descontoCentavos ?? 0;
  const { receitas } = resumo;
  const lucroNegativo = resumo.lucroCentavos < 0;

  const linhasReceita = [
    ["Saídas avulsas", receitas.avulsoCentavos],
    ["Mensalidades", receitas.mensalidadesCentavos],
    ["Reservas pagas", receitas.reservasCentavos],
    ["Reembolsos devolvidos", -receitas.reembolsosCentavos],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-4xl leading-none font-bold tracking-tight first-letter:uppercase">
          {nomeDoMes(competencia)}
        </h1>
        <nav className="flex gap-1" aria-label="Mês">
          <Link
            href={`/financeiro?mes=${deslocarCompetencia(competencia, -1)}`}
            className="grid size-11 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Mês anterior"
          >
            <ChevronLeft aria-hidden />
          </Link>
          {competencia !== atual && (
            <Link
              href="/financeiro"
              className="flex h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-slate-100"
            >
              Hoje
            </Link>
          )}
          <Link
            href={`/financeiro?mes=${deslocarCompetencia(competencia, 1)}`}
            className="grid size-11 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Próximo mês"
          >
            <ChevronRight aria-hidden />
          </Link>
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Receita</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {formatarCentavos(resumo.receitaCentavos)}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Custos</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {formatarCentavos(resumo.custoCentavos)}
          </p>
        </Card>
        <Card
          className={cn(lucroNegativo ? "border-alerta bg-red-50" : "border-livre bg-green-50")}
        >
          <p className="text-sm font-medium text-slate-600">
            {lucroNegativo ? "Prejuízo" : "Lucro"}
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold tabular-nums",
              lucroNegativo ? "text-alerta" : "text-livre",
            )}
          >
            {formatarCentavos(resumo.lucroCentavos)}
          </p>
        </Card>
      </div>

      <Card>
        <ul className="divide-y divide-slate-100 text-sm">
          {linhasReceita.map(([nome, valor]) => (
            <li key={nome} className="flex justify-between py-1.5">
              <span className="text-slate-600">{nome}</span>
              <span className="font-semibold tabular-nums">{formatarCentavos(valor)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Regime de caixa: vale o dia em que o dinheiro entrou. Sem conciliação bancária.
        </p>
        {aReceberConvenios > 0 && (
          <p className="bg-primaria-clara text-primaria-escura mt-2 rounded-lg p-2 text-sm">
            Fora da receita acima: <strong>{formatarCentavos(aReceberConvenios)}</strong> de
            descontos de convênio a cobrar dos parceiros neste mês.{" "}
            <Link href={`/convenios?mes=${competencia}`} className="font-semibold underline">
              Ver por parceiro
            </Link>
          </p>
        )}
      </Card>

      <Custos custos={resumo.custos} competencia={competencia} hoje={op.hoje} />
      <Equipe funcionarios={funcionarios} />
    </div>
  );
}
