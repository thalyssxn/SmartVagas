"use client";

import { Loader2, Pause, Phone, Play, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Campo } from "@/components/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import type { TipoDesconto, TipoParceiro } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDia } from "@/lib/tempo";
import { alternarConvenioAction, criarConvenioAction } from "../actions";
import type { ConvenioListado } from "../queries";
import { descreverDesconto } from "../regras";

export const ROTULO_PARCEIRO: Record<TipoParceiro, string> = {
  loja: "Loja",
  shopping: "Shopping",
  evento: "Evento",
  empresa: "Empresa",
  outro: "Outro",
};

const CAMPO_DESCONTO: Record<TipoDesconto, { rotulo: string; dica: string; placeholder: string }> =
  {
    percentual: {
      rotulo: "Desconto (%)",
      dica: "Parte do valor da saída que o parceiro paga.",
      placeholder: "20",
    },
    minutos: {
      rotulo: "Minutos grátis",
      dica: "Ex.: 60 = a primeira hora fica por conta do parceiro.",
      placeholder: "60",
    },
    valor: {
      rotulo: "Valor abatido (R$)",
      dica: "Valor fixo descontado de cada saída.",
      placeholder: "5,00",
    },
  };

export function NovoConvenio() {
  const [aberto, setAberto] = useState(false);
  const [tipoDesconto, setTipoDesconto] = useState<TipoDesconto>("minutos");
  const [pendente, iniciar] = useTransition();
  const campo = CAMPO_DESCONTO[tipoDesconto];

  function criar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const c = (n: string) => String(dados.get(n) ?? "");
      const r = await criarConvenioAction({
        nome: c("nome"),
        tipo: c("tipo") as TipoParceiro,
        contato: c("contato"),
        telefone: c("telefone"),
        tipoDesconto,
        valor: c("valor"),
        validoAte: c("validoAte"),
        observacao: c("observacao"),
      });
      if (!r.ok) {
        toast.error(r.erro.mensagem);
        return;
      }
      toast.success("Convênio criado. Já aparece na saída do pátio.");
      form.reset();
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <Button variant="destaque" onClick={() => setAberto(true)}>
        <Plus aria-hidden />
        Novo convênio
      </Button>
    );
  }

  return (
    <Card className="w-full space-y-3">
      <CardTitle>Novo convênio</CardTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Campo
          id="nome"
          rotulo="Parceiro"
          required
          maxLength={80}
          placeholder="Ex.: Shopping Central"
          autoFocus
        />
        <div className="space-y-1">
          <Label htmlFor="tipo">Tipo de parceiro</Label>
          <Select id="tipo" name="tipo" defaultValue="loja">
            {Object.entries(ROTULO_PARCEIRO).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tipoDesconto">Como é o desconto</Label>
          <Select
            id="tipoDesconto"
            value={tipoDesconto}
            onChange={(e) => setTipoDesconto(e.target.value as TipoDesconto)}
          >
            <option value="minutos">Minutos grátis</option>
            <option value="percentual">Porcentagem do valor</option>
            <option value="valor">Valor fixo em reais</option>
          </Select>
        </div>
        <Campo
          key={tipoDesconto}
          id="valor"
          rotulo={campo.rotulo}
          dica={campo.dica}
          placeholder={campo.placeholder}
          inputMode={tipoDesconto === "valor" ? "decimal" : "numeric"}
          required
        />
        <Campo
          id="contato"
          rotulo="Contato (opcional)"
          maxLength={80}
          placeholder="Nome de quem responde"
        />
        <Campo id="telefone" rotulo="Telefone (opcional)" maxLength={20} inputMode="tel" />
        <Campo
          id="validoAte"
          rotulo="Válido até (opcional)"
          type="date"
          dica="Vazio = sem prazo."
        />
        <Campo
          id="observacao"
          rotulo="Observação (opcional)"
          maxLength={200}
          placeholder="Ex.: ticket carimbado pela loja"
        />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Criar convênio
          </Button>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function CartaoConvenio({ c, hoje }: { c: ConvenioListado; hoje: string }) {
  const [pendente, iniciar] = useTransition();
  const vencido = c.validoAte !== null && c.validoAte < hoje;

  function alternar() {
    iniciar(async () => {
      const r = await alternarConvenioAction(c.id);
      if (!r.ok) toast.error(r.erro.mensagem);
      else toast.success(r.dados.ativo ? `${c.nome} reativado.` : `${c.nome} pausado.`);
    });
  }

  return (
    <Card className={c.ativo && !vencido ? "space-y-3" : "space-y-3 bg-slate-50"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="info">{ROTULO_PARCEIRO[c.tipo]}</Badge>
            {!c.ativo && <Badge>Pausado</Badge>}
            {vencido && <Badge variant="warning">Venceu {formatarDia(c.validoAte!)}</Badge>}
          </div>
          <p className="mt-1.5 text-lg leading-tight font-bold">{c.nome}</p>
          <p className="text-primaria text-sm font-semibold">{descreverDesconto(c)}</p>
        </div>
        <Button variant="ghost" size="sm" disabled={pendente} onClick={alternar}>
          {c.ativo ? <Pause aria-hidden /> : <Play aria-hidden />}
          {c.ativo ? "Pausar" : "Reativar"}
        </Button>
      </div>
      <dl className="bg-concreto grid grid-cols-2 gap-2 rounded-xl p-3">
        <div>
          <dt className="text-xs text-slate-500">Saídas no mês</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">{c.usos}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">A cobrar do parceiro</dt>
          <dd className="font-display text-2xl font-bold tabular-nums">
            {formatarCentavos(c.aFaturarCentavos)}
          </dd>
        </div>
      </dl>
      {(c.contato || c.telefone || c.observacao || c.validoAte) && (
        <div className="space-y-0.5 text-sm text-slate-600">
          {(c.contato || c.telefone) && (
            <p className="flex items-center gap-1.5">
              <Phone className="size-3.5" aria-hidden />
              {[c.contato, c.telefone].filter(Boolean).join(" · ")}
            </p>
          )}
          {c.validoAte && !vencido && <p>Válido até {formatarDia(c.validoAte)}</p>}
          {c.observacao && <p className="text-slate-500">{c.observacao}</p>}
        </div>
      )}
    </Card>
  );
}
