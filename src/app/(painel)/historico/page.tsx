import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { Placa } from "@/components/placa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, TituloPagina } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import { FormRetroativo } from "@/features/estadias/components/form-retroativo";
import { ROTULO_FORMA } from "@/features/estadias/formas-pagamento";
import { filtroHistoricoSchema, listarHistorico } from "@/features/estadias/historico";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDataHora } from "@/lib/tempo";
import { prisma } from "@/server/db";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Histórico" };

export default async function PaginaHistorico({ searchParams }: PageProps<"/historico">) {
  const contexto = await exigirEquipe();
  const op = await obterOperacao(contexto.estacionamentoId);
  const bruto = await searchParams;
  const texto = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const filtro = filtroHistoricoSchema.safeParse({
    placa: texto(bruto.placa),
    de: texto(bruto.de),
    ate: texto(bruto.ate),
  });
  const { estadias, truncado } = await listarHistorico(
    contexto.estacionamentoId,
    filtro.success ? filtro.data : {},
    op.fuso,
  );
  const vagas = await prisma.vaga.findMany({
    where: { estacionamentoId: contexto.estacionamentoId },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true },
  });

  return (
    <div className="space-y-4">
      <TituloPagina titulo="Histórico" descricao="Entradas e saídas por placa e período." />
      <Card>
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="h-placa">Placa</Label>
            <Input
              id="h-placa"
              name="placa"
              defaultValue={texto(bruto.placa)}
              placeholder="ABC ou ABC1D23"
              className="uppercase"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="h-de">De</Label>
            <Input id="h-de" name="de" type="date" defaultValue={texto(bruto.de)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="h-ate">Até</Label>
            <Input id="h-ate" name="ate" type="date" defaultValue={texto(bruto.ate)} />
          </div>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <FormRetroativo vagas={vagas} />

      <Card>
        {estadias.length === 0 ? (
          <Vazio
            Icone={SearchX}
            titulo="Nada encontrado"
            dica="Tente outra placa ou outro período."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {estadias.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <Placa valor={e.placa} />
                <span className="min-w-0 flex-1 text-sm text-slate-600">
                  Vaga {e.vaga.numero} · {formatarDataHora(e.entradaEm, op.fuso)} →{" "}
                  {e.saidaEm ? formatarDataHora(e.saidaEm, op.fuso) : "ainda dentro"}
                </span>
                {e.retroativa && <Badge variant="warning">Retroativo</Badge>}
                {e.valorCentavos !== null && (
                  <span className="text-sm font-semibold tabular-nums">
                    {formatarCentavos(e.valorCentavos)}
                    {e.formaPagamento && (
                      <span className="ml-1 font-normal text-slate-500">
                        {ROTULO_FORMA[e.formaPagamento]}
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {truncado && (
          <p className="pt-3 text-xs text-slate-500">
            Mostrando as 200 mais recentes. Refine o filtro para ver outras.
          </p>
        )}
      </Card>
    </div>
  );
}
