"use client";

import { Bike, Car, Loader2, Plus, Trash2, Truck, type LucideIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Placa } from "@/components/placa";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { TipoVeiculo } from "@/generated/prisma/enums";
import { normalizarPlaca } from "@/lib/placa";
import { cn } from "@/lib/utils";
import { ROTULO_TIPO_VEICULO } from "@/lib/veiculo";
import { adicionarVeiculoAction, removerVeiculoAction } from "../actions";

export const ICONE_VEICULO: Record<TipoVeiculo, LucideIcon> = {
  carro: Car,
  moto: Bike,
  grande: Truck,
};

export function FormVeiculo() {
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipo, setTipo] = useState<TipoVeiculo>("carro");
  const [pendente, iniciar] = useTransition();

  function adicionar() {
    iniciar(async () => {
      const resultado = await adicionarVeiculoAction({ placa, modelo, tipo });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      toast.success(`${resultado.dados.placa} adicionado.`);
      setPlaca("");
      setModelo("");
    });
  }

  return (
    <Card>
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          adicionar();
        }}
        className="space-y-4"
      >
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-semibold text-slate-700">Tipo</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(ROTULO_TIPO_VEICULO) as TipoVeiculo[]).map((t) => {
              const Icone = ICONE_VEICULO[t];
              return (
                <label
                  key={t}
                  className={cn(
                    "has-[:checked]:border-asfalto has-[:checked]:bg-asfalto flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-controle)] border border-slate-300 text-sm font-semibold text-slate-700 has-[:checked]:text-white",
                  )}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={t}
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                    className="sr-only"
                  />
                  <Icone className="size-5" aria-hidden />
                  {ROTULO_TIPO_VEICULO[t]}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Caminhonete, SUV grande e van usam vaga de veículo grande.
          </p>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="nova-placa">Placa</Label>
            <Input
              id="nova-placa"
              value={placa}
              onChange={(e) => setPlaca(normalizarPlaca(e.target.value).slice(0, 7))}
              placeholder="ABC1D23"
              autoComplete="off"
              className="font-bold tracking-widest uppercase"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="novo-modelo">Modelo (opcional)</Label>
            <Input
              id="novo-modelo"
              value={modelo}
              maxLength={40}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ex.: Onix prata"
            />
          </div>
          <Button type="submit" disabled={pendente || placa.length < 7}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Adicionar
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ItemVeiculo({
  id,
  placa,
  modelo,
  tipo,
}: {
  id: string;
  placa: string;
  modelo: string | null;
  tipo: TipoVeiculo;
}) {
  const [pendente, iniciar] = useTransition();
  const Icone = ICONE_VEICULO[tipo];

  function remover() {
    if (!window.confirm(`Remover ${placa}?`)) return;
    iniciar(async () => {
      const resultado = await removerVeiculoAction(id);
      if (!resultado.ok) toast.error(resultado.erro.mensagem);
    });
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="bg-concreto grid size-10 place-items-center rounded-lg text-slate-600">
        <Icone className="size-5" aria-label={ROTULO_TIPO_VEICULO[tipo]} />
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3">
        <Placa valor={placa} tamanho="md" />
        <span className="text-sm text-slate-500">
          {ROTULO_TIPO_VEICULO[tipo]}
          {modelo && ` · ${modelo}`}
        </span>
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={pendente}
        onClick={remover}
        aria-label={`Remover ${placa}`}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
