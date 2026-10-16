"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatarCentavos } from "@/lib/dinheiro";
import { alternarPlanoAction, criarPlanoAction } from "../actions";
import { NOMES_DIAS, descreverJanela } from "../janela";

type PlanoNaLista = {
  id: string;
  nome: string;
  valorCentavos: number;
  diasSemana: number[];
  inicioMin: number | null;
  fimMin: number | null;
  ativo: boolean;
};

const TODOS = [0, 1, 2, 3, 4, 5, 6];

export function Planos({ planos }: { planos: PlanoNaLista[] }) {
  const [dias, setDias] = useState<number[]>(TODOS);
  const [pendente, iniciar] = useTransition();

  function alternarDia(dia: number) {
    setDias((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]));
  }

  function criar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const resultado = await criarPlanoAction({
        nome: String(dados.get("nome")),
        valor: String(dados.get("valor")),
        diasSemana: dias,
        inicio: String(dados.get("inicio") ?? ""),
        fim: String(dados.get("fim") ?? ""),
      });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      toast.success("Plano criado.");
      form.reset();
      setDias(TODOS);
    });
  }

  function alternar(plano: PlanoNaLista) {
    iniciar(async () => {
      const resultado = await alternarPlanoAction(plano.id);
      if (!resultado.ok) toast.error(resultado.erro.mensagem);
    });
  }

  return (
    <Card className="space-y-4">
      <CardTitle>Planos</CardTitle>
      <ul className="divide-y divide-slate-100">
        {planos.map((plano) => (
          <li key={plano.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="font-semibold">
                {plano.nome} · {formatarCentavos(plano.valorCentavos)}
                {!plano.ativo && <Badge className="ml-2">Desativado</Badge>}
              </p>
              <p className="text-sm text-slate-600">{descreverJanela(plano)}</p>
            </div>
            <Button variant="ghost" disabled={pendente} onClick={() => alternar(plano)}>
              {plano.ativo ? "Desativar" : "Reativar"}
            </Button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
      >
        <div className="space-y-1">
          <Label htmlFor="p-nome">Nome do plano</Label>
          <Input id="p-nome" name="nome" required maxLength={40} placeholder="Ex.: Comercial" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-valor">Valor mensal (R$)</Label>
          <Input id="p-valor" name="valor" inputMode="decimal" required placeholder="250,00" />
        </div>
        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-sm font-medium text-slate-700">Dias que o plano cobre</legend>
          <div className="flex flex-wrap gap-2">
            {TODOS.map((dia) => (
              <label
                key={dia}
                className="flex h-11 min-w-14 cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold has-[:checked]:border-primaria has-[:checked]:bg-primaria has-[:checked]:text-white"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={dias.includes(dia)}
                  onChange={() => alternarDia(dia)}
                />
                {NOMES_DIAS[dia]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1">
          <Label htmlFor="p-inicio">Das (vazio = dia inteiro)</Label>
          <Input id="p-inicio" name="inicio" type="time" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-fim">Até (pode ser no dia seguinte)</Label>
          <Input id="p-fim" name="fim" type="time" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Criar plano
          </Button>
        </div>
      </form>
    </Card>
  );
}
