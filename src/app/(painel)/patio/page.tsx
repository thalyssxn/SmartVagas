import { CircleSlash } from "lucide-react";
import type { Metadata } from "next";
import { AtualizacaoAutomatica } from "@/components/atualizacao-automatica";
import { obterOperacao } from "@/features/configuracao/queries";
import { conveniosParaGuiche } from "@/features/convenios/servico";
import { Patio } from "@/features/estadias/components/patio";
import { listarVagasDoMapa } from "@/features/vagas/queries";
import { prisma } from "@/server/db";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Pátio" };

export default async function PaginaPatio({ searchParams }: PageProps<"/patio">) {
  const contexto = await exigirEquipe();
  const op = await obterOperacao(contexto.estacionamentoId);
  const [vagas, convenios, esperando] = await Promise.all([
    listarVagasDoMapa(contexto.estacionamentoId, op),
    conveniosParaGuiche(contexto.estacionamentoId),
    prisma.alertaVaga.count({
      where: { estacionamentoId: contexto.estacionamentoId, notificadoEm: null },
    }),
  ]);
  const { estadia } = await searchParams;
  const lotado = !vagas.some((v) => v.status === "livre");

  return (
    <div className="space-y-4">
      <AtualizacaoAutomatica />
      {lotado && (
        <p
          role="status"
          className="bg-alerta flex items-center gap-2 rounded-xl p-3 font-semibold text-white"
        >
          <CircleSlash className="size-5 shrink-0" aria-hidden />
          Pátio lotado: a busca dos motoristas mostra &quot;Lotado agora&quot;.
          {esperando > 0 &&
            ` ${esperando} motorista(s) pediram aviso e serão avisados na próxima saída.`}
        </p>
      )}
      <Patio
        vagas={vagas}
        agora={op.agora.toISOString()}
        fuso={op.fuso}
        estadiaInicialId={typeof estadia === "string" ? estadia : undefined}
        convenios={convenios}
        tabela={op.tabela}
      />
    </div>
  );
}
