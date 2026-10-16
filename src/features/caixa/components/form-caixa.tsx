"use client";

import { Loader2, Lock, Unlock } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatarCentavos } from "@/lib/dinheiro";
import { abrirTurnoAction, fecharTurnoAction } from "../actions";

export function FormAbrirCaixa() {
  const [troco, setTroco] = useState("");
  const [pendente, iniciar] = useTransition();

  function abrir() {
    iniciar(async () => {
      const resultado = await abrirTurnoAction({ troco });
      if (!resultado.ok) toast.error(resultado.erro.mensagem);
      else toast.success("Caixa aberto.");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        abrir();
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="troco">Troco inicial na gaveta (R$)</Label>
        <Input
          id="troco"
          inputMode="decimal"
          value={troco}
          onChange={(e) => setTroco(e.target.value)}
          placeholder="0,00"
          required
          autoFocus
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Unlock aria-hidden />}
        Abrir caixa
      </Button>
    </form>
  );
}

export function FormFecharCaixa({ esperadoCentavos }: { esperadoCentavos: number }) {
  const [contado, setContado] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pendente, iniciar] = useTransition();

  function fechar() {
    if (!window.confirm("Fechar o caixa agora?")) return;
    iniciar(async () => {
      const resultado = await fecharTurnoAction({ contado, observacao });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      const { diferencaCentavos } = resultado.dados;
      if (diferencaCentavos === 0) toast.success("Caixa fechado. Bateu certinho.");
      else
        toast.warning(
          `Caixa fechado com ${diferencaCentavos > 0 ? "sobra" : "falta"} de ${formatarCentavos(Math.abs(diferencaCentavos))}.`,
        );
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        fechar();
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="contado">Dinheiro contado na gaveta (R$)</Label>
        <Input
          id="contado"
          inputMode="decimal"
          value={contado}
          onChange={(e) => setContado(e.target.value)}
          placeholder={formatarCentavos(esperadoCentavos).replace("R$", "").trim()}
          required
        />
        <p className="text-xs text-slate-500">
          Conte a gaveta antes de olhar o valor esperado; a diferença fica registrada para o dono.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="obs">Observação (opcional)</Label>
        <Input
          id="obs"
          value={observacao}
          maxLength={200}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" variant="danger" className="w-full" disabled={pendente}>
        {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Lock aria-hidden />}
        Fechar caixa
      </Button>
    </form>
  );
}
