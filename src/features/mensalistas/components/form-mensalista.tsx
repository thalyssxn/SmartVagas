"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { formatarCentavos } from "@/lib/dinheiro";
import { normalizarPlaca } from "@/lib/placa";
import { cadastrarMensalistaAction } from "../actions";

type Props = {
  planos: { id: string; nome: string; valorCentavos: number }[];
  vagas: { id: string; numero: string }[];
};

export function FormMensalista({ planos, vagas }: Props) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();

  function cadastrar(dados: FormData) {
    iniciar(async () => {
      const campo = (nome: string) => String(dados.get(nome) ?? "");
      const resultado = await cadastrarMensalistaAction({
        nome: campo("nome"),
        telefone: campo("telefone"),
        email: campo("email"),
        placa: campo("placa"),
        modelo: campo("modelo"),
        planoId: campo("planoId"),
        vagaFixaId: campo("vagaFixaId"),
      });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      toast.success("Mensalista cadastrado. Falta receber o 1º pagamento.");
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <Button onClick={() => setAberto(true)} disabled={planos.length === 0}>
        <UserPlus aria-hidden />
        Novo mensalista
      </Button>
    );
  }

  return (
    <Card>
      <CardTitle>Novo mensalista</CardTitle>
      <form action={cadastrar} className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="m-nome">Nome</Label>
          <Input id="m-nome" name="nome" required autoFocus />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-placa">Placa</Label>
          <Input
            id="m-placa"
            name="placa"
            required
            maxLength={8}
            placeholder="ABC1D23"
            className="font-bold tracking-widest uppercase"
            onChange={(e) => (e.target.value = normalizarPlaca(e.target.value).slice(0, 7))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-modelo">Modelo (opcional)</Label>
          <Input id="m-modelo" name="modelo" maxLength={40} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-tel">Telefone (opcional)</Label>
          <Input id="m-tel" name="telefone" inputMode="tel" maxLength={20} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-email">E-mail (opcional)</Label>
          <Input id="m-email" name="email" type="email" />
          <p className="text-xs text-slate-500">Com e-mail, o cliente vê o plano ao criar a conta no portal.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-plano">Plano</Label>
          <Select id="m-plano" name="planoId" required defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} · {formatarCentavos(p.valorCentavos)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="m-vaga">Vaga fixa (opcional)</Label>
          <Select id="m-vaga" name="vagaFixaId" defaultValue="">
            <option value="">Rotativa (sem número garantido)</option>
            {vagas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.numero}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" aria-hidden />}
            Cadastrar
          </Button>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
