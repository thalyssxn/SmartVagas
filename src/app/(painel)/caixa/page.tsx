import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, TituloPagina } from "@/components/ui/card";
import { listarTurnosFechados, turnoAbertoDoOperador } from "@/features/caixa/queries";
import { FormAbrirCaixa, FormFecharCaixa } from "@/features/caixa/components/form-caixa";
import { obterOperacao } from "@/features/configuracao/queries";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDataHora } from "@/lib/tempo";
import { ehDono, exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Caixa" };

export default async function PaginaCaixa() {
  const contexto = await exigirEquipe();
  const op = await obterOperacao(contexto.estacionamentoId);
  const turno = await turnoAbertoDoOperador(contexto.usuarioId);
  const fechados = ehDono(contexto) ? await listarTurnosFechados(contexto.estacionamentoId) : [];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <TituloPagina
        titulo="Caixa"
        descricao="Abra com o troco e feche contando a gaveta. A diferença fica para o administrador conferir."
      />
      <Card className="space-y-3">
        <CardTitle>Meu caixa</CardTitle>
        {turno ? (
          <>
            <p className="text-sm text-slate-600">
              Aberto desde {formatarDataHora(turno.abertoEm, op.fuso)} · troco inicial{" "}
              <strong>{formatarCentavos(turno.trocoInicialCentavos)}</strong>
            </p>
            {/* Contagem às cegas: o operador não vê o esperado antes de contar. */}
            <FormFecharCaixa esperadoCentavos={0} />
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Abra o caixa no começo do turno. As saídas pagas só entram na sua conferência com o
              caixa aberto.
            </p>
            <FormAbrirCaixa />
          </>
        )}
      </Card>

      {ehDono(contexto) && (
        <Card>
          <CardTitle>Turnos fechados</CardTitle>
          {fechados.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Nenhum turno fechado ainda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {fechados.map((t) => {
                const diferenca = (t.contadoCentavos ?? 0) - (t.esperadoCentavos ?? 0);
                return (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-semibold">{t.operador.name}</p>
                      <p className="text-sm text-slate-600">
                        {formatarDataHora(t.abertoEm, op.fuso)} →{" "}
                        {formatarDataHora(t.fechadoEm!, op.fuso)}
                      </p>
                      {t.observacao && <p className="text-xs text-slate-500">{t.observacao}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        Esperado {formatarCentavos(t.esperadoCentavos ?? 0)} · contado{" "}
                        {formatarCentavos(t.contadoCentavos ?? 0)}
                      </p>
                      {diferenca === 0 ? (
                        <Badge variant="success">Bateu</Badge>
                      ) : (
                        <Badge variant={diferenca < 0 ? "danger" : "warning"}>
                          {diferenca < 0 ? "Falta" : "Sobra"}{" "}
                          {formatarCentavos(Math.abs(diferenca))}
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
