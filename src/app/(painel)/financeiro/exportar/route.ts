import { obterOperacao } from "@/features/configuracao/queries";
import { competenciaValida } from "@/features/financeiro/periodo";
import { resumoFinanceiro } from "@/features/financeiro/queries";
import { centavosParaPlanilha, montarCsv } from "@/features/financeiro/regras";
import { exigirEquipe } from "@/server/sessao";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const contexto = await exigirEquipe(["dono"]);
  const op = await obterOperacao(contexto.estacionamentoId);
  const mes = new URL(request.url).searchParams.get("mes");
  const competencia = competenciaValida(mes ?? undefined) ? mes! : op.hoje.slice(0, 7);

  const resumo = await resumoFinanceiro(contexto.estacionamentoId, competencia, op.fuso);
  const { receitas } = resumo;

  const csv = montarCsv([
    ["Tipo", "Categoria", "Descrição", "Data", "Valor (R$)"],
    ["Receita", "Saídas avulsas", "Total do mês", competencia, centavosParaPlanilha(receitas.avulsoCentavos)],
    ["Receita", "Mensalidades", "Total do mês", competencia, centavosParaPlanilha(receitas.mensalidadesCentavos)],
    ["Receita", "Reservas pagas", "Total do mês", competencia, centavosParaPlanilha(receitas.reservasCentavos)],
    ["Receita", "Reembolsos", "Total do mês", competencia, centavosParaPlanilha(-receitas.reembolsosCentavos)],
    ...resumo.custos.map((c) => [
      "Custo",
      c.categoria,
      c.descricao,
      c.data,
      centavosParaPlanilha(-c.valorCentavos),
    ]),
    ["Resultado", "", "Lucro do mês", competencia, centavosParaPlanilha(resumo.lucroCentavos)],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${competencia}.csv"`,
    },
  });
}
