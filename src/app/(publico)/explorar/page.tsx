import type { Metadata } from "next";
import { AtualizacaoAutomatica } from "@/components/atualizacao-automatica";
import { TituloPagina } from "@/components/ui/card";
import { Explorar } from "@/features/explorar/components/explorar";
import { listarCidades, listarEstacionamentosPublicos } from "@/features/explorar/queries";
import { env } from "@/lib/env";
import { obterSessao } from "@/server/sessao";

export const metadata: Metadata = { title: "Encontrar vaga" };
export const dynamic = "force-dynamic";

export default async function PaginaExplorar() {
  const [estacionamentos, cidades, sessao] = await Promise.all([
    listarEstacionamentosPublicos(),
    listarCidades(),
    obterSessao(),
  ]);

  return (
    <div className="space-y-6">
      <AtualizacaoAutomatica />
      <TituloPagina
        titulo="Encontrar vaga"
        descricao="Estacionamentos SmartVagas perto de você, com vagas livres agora e preço da primeira hora."
      />
      <Explorar
        estacionamentos={estacionamentos}
        cidades={cidades}
        logado={sessao?.user.papel === "motorista"}
        fuso={env.APP_TIMEZONE}
      />
    </div>
  );
}
