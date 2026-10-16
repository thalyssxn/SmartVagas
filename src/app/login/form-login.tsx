"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const MUITAS_TENTATIVAS = 429;
const CREDENCIAIS_INVALIDAS = [400, 401, 403];

// Só diz "senha incorreta" quando é isso mesmo: banco fora do ar não pode parecer senha errada.
function mensagemDeErro(status: number): string {
  if (status === MUITAS_TENTATIVAS) return "Muitas tentativas. Aguarde um minuto.";
  if (CREDENCIAIS_INVALIDAS.includes(status)) return "E-mail ou senha incorretos.";
  return "Não foi possível entrar agora: o servidor ou o banco de dados não respondeu. Tente de novo em instantes.";
}

type Props = {
  aviso?: string;
  /** Para onde ir depois de entrar (ex.: a reserva que o motorista começou sem login). */
  voltar?: string;
  emailInicial?: string;
};

export function FormLogin({ aviso, voltar, emailInicial }: Props) {
  const router = useRouter();
  const [erro, setErro] = useState(aviso ?? null);
  const [pendente, iniciar] = useTransition();

  function entrar(dados: FormData) {
    iniciar(async () => {
      const { error } = await authClient.signIn.email({
        email: String(dados.get("email")).trim().toLowerCase(),
        password: String(dados.get("senha")),
      });
      if (error) {
        setErro(mensagemDeErro(error.status));
        return;
      }
      router.replace(voltar ?? "/inicio");
      router.refresh();
    });
  }

  return (
    <form action={entrar} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={emailInicial}
          key={emailInicial}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {erro && (
        <p role="alert" className="text-alerta text-sm font-medium">
          {erro}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente && <Loader2 className="animate-spin" aria-hidden />}
        Entrar
      </Button>
    </form>
  );
}
