import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TelaAuth } from "@/components/tela-auth";
import { caminhoSeguro } from "@/lib/navegacao";
import { obterSessao } from "@/server/sessao";
import { FormCadastro } from "./form-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default async function PaginaCadastro({ searchParams }: PageProps<"/cadastro">) {
  if (await obterSessao()) redirect("/inicio");
  const voltar = caminhoSeguro((await searchParams).voltar);

  return (
    <TelaAuth
      titulo="Crie sua conta de motorista"
      subtitulo="Grátis. Com ela você reserva em qualquer estacionamento SmartVagas."
    >
      <FormCadastro voltar={voltar} />
      <div className="space-y-1 text-sm text-slate-600">
        <p>
          Já tem conta?{" "}
          <Link
            href={voltar ? `/login?voltar=${encodeURIComponent(voltar)}` : "/login"}
            className="text-primaria font-semibold underline-offset-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
        <p>
          É dono de estacionamento?{" "}
          <Link
            href="/cadastro/parceiro"
            className="text-primaria font-semibold underline-offset-2 hover:underline"
          >
            Cadastre seu estacionamento
          </Link>
        </p>
      </div>
    </TelaAuth>
  );
}
