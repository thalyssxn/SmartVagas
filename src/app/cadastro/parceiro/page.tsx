import type { Metadata } from "next";
import Link from "next/link";
import { TelaAuth } from "@/components/tela-auth";
import { FormParceiro } from "./form-parceiro";

export const metadata: Metadata = { title: "Cadastrar estacionamento" };

export default function PaginaCadastroParceiro() {
  return (
    <TelaAuth
      titulo="Cadastre seu estacionamento"
      subtitulo="Pátio, caixa, mensalistas, convênios e reservas online num lugar só."
      frase="Do caderno ao lucro do mês, sem planilha."
    >
      <FormParceiro />
      <p className="text-sm text-slate-600">
        Já tem acesso?{" "}
        <Link
          href="/login?perfil=equipe"
          className="text-primaria font-semibold underline-offset-2 hover:underline"
        >
          Entrar como equipe
        </Link>
      </p>
    </TelaAuth>
  );
}
