import Link from "next/link";
import { contarAvisosNaoLidos } from "@/features/avisos/servico";
import { COMMIT, VERSAO } from "@/lib/versao";
import { cn } from "@/lib/utils";
import { obterSessao } from "@/server/sessao";
import { CabecalhoSite, type UsuarioSite } from "./cabecalho-site";

export async function usuarioDoSite(): Promise<UsuarioSite> {
  const sessao = await obterSessao();
  if (!sessao) return { tipo: "visitante" };
  if (sessao.user.papel === "motorista") {
    return {
      tipo: "motorista",
      nome: sessao.user.name,
      avisos: await contarAvisosNaoLidos(sessao.user.id),
    };
  }
  return { tipo: "equipe", nome: sessao.user.name };
}

/** Moldura das páginas públicas e do portal do motorista. */
export async function MolduraSite({
  children,
  largura = "max-w-5xl",
  usuario,
}: {
  children: React.ReactNode;
  largura?: string;
  usuario?: UsuarioSite;
}) {
  const quem = usuario ?? (await usuarioDoSite());
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <CabecalhoSite usuario={quem} />
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 py-6 sm:py-8",
          largura,
          quem.tipo === "motorista" && "pb-24 md:pb-8",
        )}
      >
        {children}
      </main>
      <footer
        className={cn(
          "border-t border-slate-900/8 bg-white",
          quem.tipo === "motorista" && "mb-16 md:mb-0",
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-slate-500">
          <span>
            SmartVagas v{VERSAO} · {COMMIT}
          </span>
          <span className="flex gap-4">
            <Link href="/explorar" className="hover:text-tinta">
              Encontrar vaga
            </Link>
            <Link href="/cadastro/parceiro" className="hover:text-tinta">
              Para estacionamentos
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
