import { ChevronLeft, ChevronRight, Handshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import { CartaoConvenio, NovoConvenio } from "@/features/convenios/components/convenios";
import { listarConvenios } from "@/features/convenios/queries";
import { competenciaValida, deslocarCompetencia, nomeDoMes } from "@/features/financeiro/periodo";
import { formatarCentavos } from "@/lib/dinheiro";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Convênios" };

export default async function PaginaConvenios({ searchParams }: PageProps<"/convenios">) {
  const contexto = await exigirEquipe(["dono"]);
  const op = await obterOperacao(contexto.estacionamentoId);
  const { mes } = await searchParams;
  const atual = op.hoje.slice(0, 7);
  const competencia = typeof mes === "string" && competenciaValida(mes) ? mes : atual;
  const convenios = await listarConvenios(contexto.estacionamentoId, competencia, op.fuso);
  const totalAFaturar = convenios.reduce((s, c) => s + c.aFaturarCentavos, 0);
  const totalUsos = convenios.reduce((s, c) => s + c.usos, 0);

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo="Convênios"
        descricao="Lojas, shoppings, eventos e empresas que pagam parte da estadia dos clientes. O operador escolhe o convênio na saída e o desconto vira cobrança para o parceiro."
      >
        <NovoConvenio />
      </TituloPagina>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <Link
            href={`/convenios?mes=${deslocarCompetencia(competencia, -1)}`}
            className="grid size-10 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Mês anterior"
          >
            <ChevronLeft aria-hidden />
          </Link>
          <p className="font-display min-w-40 text-center text-2xl font-bold first-letter:uppercase">
            {nomeDoMes(competencia)}
          </p>
          <Link
            href={`/convenios?mes=${deslocarCompetencia(competencia, 1)}`}
            className="grid size-10 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Próximo mês"
          >
            <ChevronRight aria-hidden />
          </Link>
        </div>
        <div className="flex gap-8">
          <p>
            <span className="block text-sm text-slate-500">Saídas com convênio</span>
            <span className="font-display text-3xl font-bold tabular-nums">{totalUsos}</span>
          </p>
          <p>
            <span className="block text-sm text-slate-500">Total a cobrar dos parceiros</span>
            <span className="font-display text-primaria text-3xl font-bold tabular-nums">
              {formatarCentavos(totalAFaturar)}
            </span>
          </p>
        </div>
      </Card>

      {convenios.length === 0 ? (
        <Card>
          <Vazio
            Icone={Handshake}
            titulo="Nenhum convênio ainda"
            dica="Crie o primeiro: por exemplo, 1 hora grátis para quem compra na loja do lado."
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {convenios.map((c) => (
            <li key={c.id}>
              <CartaoConvenio c={c} hoje={op.hoje} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
