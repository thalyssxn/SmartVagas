"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { cadastrarParceiroAction } from "@/features/parceiros/actions";
import { authClient } from "@/lib/auth-client";

export function FormParceiro() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function cadastrar(dados: FormData) {
    iniciar(async () => {
      const c = (n: string) => String(dados.get(n) ?? "");
      const resultado = await cadastrarParceiroAction({
        nome: c("nome"),
        email: c("email"),
        senha: c("senha"),
        estacionamento: c("estacionamento"),
        endereco: c("endereco"),
        cidade: c("cidade"),
        vagas: c("vagas"),
      });
      if (!resultado.ok) {
        setErro(resultado.erro.mensagem);
        return;
      }
      // Login pelo endpoint HTTP, para valer o rate-limit como qualquer outro acesso.
      const { error } = await authClient.signIn.email({
        email: resultado.dados.email,
        password: c("senha"),
      });
      if (error) {
        router.replace(`/login?perfil=equipe&email=${encodeURIComponent(resultado.dados.email)}`);
        return;
      }
      router.replace("/configuracoes?novo=1");
      router.refresh();
    });
  }

  return (
    <form action={cadastrar} className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="text-tinta mb-2 font-semibold">O estacionamento</legend>
        <Campo
          id="estacionamento"
          rotulo="Nome do estacionamento"
          required
          maxLength={80}
          className="sm:col-span-2"
        />
        <Campo
          id="endereco"
          rotulo="Endereço"
          required
          maxLength={120}
          placeholder="Rua, número, bairro"
          className="sm:col-span-2"
        />
        <Campo id="cidade" rotulo="Cidade" required maxLength={60} placeholder="Sorocaba" />
        <Campo
          id="vagas"
          rotulo="Quantas vagas"
          type="number"
          min={1}
          max={500}
          defaultValue={30}
          required
          dica="Dá para ajustar tipo e setor depois."
        />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="text-tinta mb-2 font-semibold">Seu acesso de administrador</legend>
        <Campo id="nome" rotulo="Seu nome" required autoComplete="name" className="sm:col-span-2" />
        <Campo id="email" rotulo="E-mail" type="email" required autoComplete="username" />
        <Campo
          id="senha"
          rotulo="Senha (mín. 8)"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </fieldset>
      {erro && (
        <p role="alert" className="text-alerta text-sm font-medium">
          {erro}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente && <Loader2 className="animate-spin" aria-hidden />}
        Cadastrar estacionamento
      </Button>
      <p className="text-xs text-slate-500">
        O estacionamento começa fora da busca dos motoristas. Você revisa preços e localização e
        publica quando quiser.
      </p>
    </form>
  );
}
