import { Building2, Car } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TelaAuth } from "@/components/tela-auth";
import { env } from "@/lib/env";
import { caminhoSeguro } from "@/lib/navegacao";
import { cn } from "@/lib/utils";
import { obterSessao } from "@/server/sessao";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

const PERFIS = {
  motorista: {
    rotulo: "Sou motorista",
    Icone: Car,
    titulo: "Entre para reservar",
    subtitulo: "Veja vagas perto de você, reserve e acompanhe o horário da sua vaga.",
    cadastro: {
      texto: "Ainda não tem conta?",
      link: "/cadastro",
      acao: "Criar conta de motorista",
    },
  },
  equipe: {
    rotulo: "Sou do estacionamento",
    Icone: Building2,
    titulo: "Acesso da equipe",
    subtitulo: "Administrador e operador entram aqui para o pátio, o caixa e a gestão.",
    cadastro: {
      texto: "Tem um estacionamento?",
      link: "/cadastro/parceiro",
      acao: "Cadastrar meu estacionamento",
    },
  },
} as const;

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { erro, perfil: perfilBruto, voltar: voltarBruto, email } = await searchParams;
  const perfil = perfilBruto === "equipe" ? "equipe" : "motorista";
  const voltar = caminhoSeguro(voltarBruto);
  const sessao = await obterSessao();
  const p = PERFIS[perfil];
  const demonstracao = env.NODE_ENV !== "production";

  const linkPerfil = (alvo: keyof typeof PERFIS) => {
    const qs = new URLSearchParams({ perfil: alvo });
    if (voltar) qs.set("voltar", voltar);
    return `/login?${qs}`;
  };

  // Sem redirecionar quem já está logado: assim dá para trocar de conta (cliente → dono).
  return (
    <TelaAuth titulo={p.titulo} subtitulo={p.subtitulo}>
      <div
        role="tablist"
        aria-label="Tipo de acesso"
        className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900/6 p-1"
      >
        {(Object.keys(PERFIS) as (keyof typeof PERFIS)[]).map((chave) => {
          const { rotulo, Icone } = PERFIS[chave];
          const ativo = chave === perfil;
          return (
            <Link
              key={chave}
              href={linkPerfil(chave)}
              role="tab"
              aria-selected={ativo}
              replace
              className={cn(
                "hover:text-tinta flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-600 transition",
                ativo && "text-tinta bg-white shadow-sm",
              )}
            >
              <Icone className="size-4" aria-hidden />
              {rotulo}
            </Link>
          );
        })}
      </div>

      {sessao && (
        <p className="bg-primaria-clara text-primaria-escura rounded-xl p-3 text-sm">
          Você já está conectado como <strong>{sessao.user.email}</strong>.{" "}
          <Link href="/inicio" className="font-semibold underline underline-offset-2">
            Continuar
          </Link>{" "}
          ou entre com outra conta.
        </p>
      )}

      <FormLogin
        aviso={erro === "sem-acesso" ? "Este usuário não tem acesso ao painel." : undefined}
        voltar={voltar}
        emailInicial={typeof email === "string" ? email : undefined}
      />

      <p className="text-sm text-slate-600">
        {p.cadastro.texto}{" "}
        <Link
          href={p.cadastro.link}
          className="text-primaria font-semibold underline-offset-2 hover:underline"
        >
          {p.cadastro.acao}
        </Link>
      </p>

      {demonstracao && (
        <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Contas de demonstração</p>
          <ul className="mt-1 space-y-0.5">
            {perfil === "equipe" ? (
              <>
                <li>
                  Administrador: <code className="text-tinta">dono@smartvagas.test</code> /{" "}
                  {process.env.SEED_SENHA_DONO}
                </li>
                <li>
                  Operador: <code className="text-tinta">operador@smartvagas.test</code> /{" "}
                  {process.env.SEED_SENHA_OPERADOR}
                </li>
              </>
            ) : (
              <li>
                Motorista: <code className="text-tinta">motorista@smartvagas.test</code> /{" "}
                {process.env.SEED_SENHA_MOTORISTA}
              </li>
            )}
          </ul>
        </div>
      )}
    </TelaAuth>
  );
}
