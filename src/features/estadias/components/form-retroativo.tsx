"use client";

import { History, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { formatarCentavos } from "@/lib/dinheiro";
import { normalizarPlaca } from "@/lib/placa";
import { lancarRetroativoAction } from "../actions-retroativo";
import { ROTULO_FORMA } from "../formas-pagamento";

export function FormRetroativo({ vagas }: { vagas: { id: string; numero: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();

  function lancar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const campo = (n: string) => String(dados.get(n) ?? "");
      const resultado = await lancarRetroativoAction({
        placa: campo("placa"),
        vagaId: campo("vagaId"),
        modelo: campo("modelo"),
        entrada: campo("entrada"),
        saida: campo("saida"),
        formaPagamento: (campo("formaPagamento") || undefined) as "dinheiro" | undefined,
      });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      const { placa, valorCentavos, aberta } = resultado.dados;
      toast.success(
        aberta ? `${placa} lançado como ainda dentro.` : `${placa} lançado: ${formatarCentavos(valorCentavos ?? 0)}.`,
      );
      form.reset();
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <Button variant="secondary" onClick={() => setAberto(true)}>
        <History aria-hidden />
        Lançar ficha de papel
      </Button>
    );
  }

  return (
    <Card>
      <CardTitle>Lançamento retroativo</CardTitle>
      <p className="text-sm text-slate-500">
        Para o que foi anotado no papel quando o sistema estava fora. Fica marcado como retroativo e
        não entra no caixa do seu turno.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lancar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="mt-3 grid gap-3 sm:grid-cols-2"
      >
        <div className="space-y-1">
          <Label htmlFor="r-placa">Placa</Label>
          <Input
            id="r-placa"
            name="placa"
            required
            placeholder="ABC1D23"
            className="font-bold tracking-widest uppercase"
            onChange={(e) => (e.target.value = normalizarPlaca(e.target.value).slice(0, 7))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-vaga">Vaga</Label>
          <Select id="r-vaga" name="vagaId" required defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {vagas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.numero}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-entrada">Entrada</Label>
          <Input id="r-entrada" name="entrada" type="datetime-local" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-saida">Saída (vazio = ainda dentro)</Label>
          <Input id="r-saida" name="saida" type="datetime-local" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-modelo">Modelo (opcional)</Label>
          <Input id="r-modelo" name="modelo" maxLength={40} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-forma">Forma de pagamento</Label>
          <Select id="r-forma" name="formaPagamento" defaultValue="">
            <option value="">Sem cobrança / ainda dentro</option>
            {Object.entries(ROTULO_FORMA).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente && <Loader2 className="animate-spin" aria-hidden />}
            Lançar
          </Button>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
