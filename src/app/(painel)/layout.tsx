import { Cabecalho } from "@/components/cabecalho";
import { COMMIT, VERSAO } from "@/lib/versao";
import { prisma } from "@/server/db";
import { exigirEquipe } from "@/server/sessao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const contexto = await exigirEquipe();
  const agora = new Date();
  const [estacionamento, reservasAguardando] = await Promise.all([
    prisma.estacionamento.findUniqueOrThrow({
      where: { id: contexto.estacionamentoId },
      select: { nome: true },
    }),
    prisma.reserva.count({
      where: {
        estacionamentoId: contexto.estacionamentoId,
        status: "pendente",
        expiraEm: { gt: agora },
      },
    }),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <Cabecalho
        nome={contexto.nome}
        papel={contexto.papel}
        estacionamento={estacionamento.nome}
        reservasAguardando={reservasAguardando}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 lg:py-8">
          {children}
        </main>
        <footer className="px-6 py-4 text-center text-xs text-slate-400 lg:text-left">
          SmartVagas v{VERSAO} · {COMMIT}
        </footer>
      </div>
    </div>
  );
}
