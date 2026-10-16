"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const SENHA_MIN = 8;

export function FormCadastro({ voltar }: { voltar?: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function criar(dados: FormData) {
    iniciar(async () => {
      const { error } = await authClient.signUp.email({
        name: String(dados.get("nome")).trim(),
        email: String(dados.get("email")).trim(),
        password: String(dados.get("senha")),
      });
      if (error) {
        setErro(
          error.status === 422
            ? "Esse e-mail já tem cadastro. Tente entrar."
            : error.status === 429
              ? "Muitas tentativas. Aguarde um minuto."
              : (error.message ?? "Não foi possível criar a conta."),
        );
        return;
      }
      router.replace(voltar ?? "/cliente/veiculos?boas-vindas=1");
      router.refresh();
    });
  }

  return (
    <form action={criar} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" autoComplete="name" required autoFocus />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="senha">Senha (mínimo {SENHA_MIN} caracteres)</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={SENHA_MIN}
          required
        />
      </div>
      {erro && (
        <p role="alert" className="text-alerta text-sm font-medium">
          {erro}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente && <Loader2 className="animate-spin" aria-hidden />}
        Criar conta
      </Button>
      <p className="text-xs text-slate-500">
        Usamos seu nome, e-mail e a placa dos seus veículos só para operar as reservas.
      </p>
    </form>
  );
}
