"use client";

import { Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Campo } from "@/components/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { alternarEventoAction, criarEventoAction } from "../actions";

const CATEGORIAS = ["Show", "Esporte", "Feira", "Teatro", "Congresso", "Festa", "Outro"] as const;

export function NovoEvento({
  inicioPadrao,
  fimPadrao,
}: {
  inicioPadrao: string;
  fimPadrao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();

  function criar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const c = (n: string) => String(dados.get(n) ?? "");
      const r = await criarEventoAction({
        nome: c("nome"),
        local: c("local"),
        categoria: (c("categoria") || undefined) as (typeof CATEGORIAS)[number] | undefined,
        descricao: c("descricao"),
        inicio: c("inicio"),
        fim: c("fim"),
      });
      if (!r.ok) {
        toast.error(r.erro.mensagem);
        return;
      }
      toast.success("Evento publicado na agenda dos motoristas.");
      form.reset();
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <Button variant="destaque" onClick={() => setAberto(true)}>
        <Plus aria-hidden />
        Divulgar evento
      </Button>
    );
  }

  return (
    <Card className="w-full space-y-3">
      <CardTitle>Novo evento</CardTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Campo
          id="nome"
          rotulo="Nome do evento"
          required
          maxLength={80}
          placeholder="Ex.: Clássico no estádio"
          autoFocus
        />
        <Campo
          id="local"
          rotulo="Onde acontece"
          required
          maxLength={80}
          placeholder="Ex.: Arena Municipal"
        />
        <div className="space-y-1">
          <Label htmlFor="categoria">Categoria</Label>
          <Select id="categoria" name="categoria" defaultValue="Show">
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <Campo id="descricao" rotulo="Descrição (opcional)" maxLength={240} />
        <Campo
          id="inicio"
          rotulo="Começa"
          type="datetime-local"
          step={900}
          defaultValue={inicioPadrao}
          required
        />
        <Campo
          id="fim"
          rotulo="Termina"
          type="datetime-local"
          step={900}
          defaultValue={fimPadrao}
          required
        />
        <p className="text-xs text-slate-500 sm:col-span-2">
          O motorista vê o evento na agenda, com as vagas reserváveis livres no horário e o botão
          para reservar.
        </p>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Publicar evento
          </Button>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function AlternarEvento({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await alternarEventoAction(id);
          if (!r.ok) toast.error(r.erro.mensagem);
          else
            toast.success(
              r.dados.ativo ? "Evento visível de novo." : "Evento escondido da agenda.",
            );
        })
      }
    >
      {ativo ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      {ativo ? "Esconder" : "Mostrar"}
    </Button>
  );
}

export function SeloVisibilidade({ ativo }: { ativo: boolean }) {
  return ativo ? <Badge variant="success">Na agenda</Badge> : <Badge>Escondido</Badge>;
}
