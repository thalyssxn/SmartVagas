import type { Metadata } from "next";
import { TituloPagina } from "@/components/ui/card";
import { AgendaEventos } from "@/features/eventos/components/agenda-eventos";
import { listarEventosPublicos } from "@/features/eventos/queries";
import { env } from "@/lib/env";
import { obterSessao } from "@/server/sessao";

export const metadata: Metadata = { title: "Eventos" };
export const dynamic = "force-dynamic";

export default async function PaginaEventos() {
  const [eventos, sessao] = await Promise.all([listarEventosPublicos(), obterSessao()]);
  return (
    <div className="space-y-6">
      <TituloPagina
        titulo="Eventos na cidade"
        descricao="Shows, jogos e feiras com estacionamento SmartVagas por perto. Reserve a vaga e chegue sem rodar o quarteirão."
      />
      <AgendaEventos
        eventos={eventos}
        fuso={env.APP_TIMEZONE}
        logado={sessao?.user.papel === "motorista"}
      />
    </div>
  );
}
