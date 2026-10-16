"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatarCentavos, paraReais } from "@/lib/dinheiro";
import {
  alternarFuncionarioAction,
  atualizarValoresFuncionarioAction,
  criarFuncionarioAction,
} from "../actions";
import { custoDoFuncionario } from "../regras";

type Funcionario = {
  id: string;
  nome: string;
  funcao: string;
  salarioCentavos: number;
  encargosCentavos: number;
  ativo: boolean;
};

function LinhaFuncionario({ f }: { f: Funcionario }) {
  const [editando, setEditando] = useState(false);
  const [salario, setSalario] = useState(paraReais(f.salarioCentavos));
  const [encargos, setEncargos] = useState(paraReais(f.encargosCentavos));
  const [pendente, iniciar] = useTransition();

  function salvar() {
    iniciar(async () => {
      const r = await atualizarValoresFuncionarioAction({ funcionarioId: f.id, salario, encargos });
      if (!r.ok) toast.error(r.erro.mensagem);
      else {
        toast.success("Valores atualizados. Valem para as próximas folhas.");
        setEditando(false);
      }
    });
  }

  function alternar() {
    iniciar(async () => {
      const r = await alternarFuncionarioAction(f.id);
      if (!r.ok) toast.error(r.erro.mensagem);
    });
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">
            {f.nome} <span className="font-normal text-slate-500">· {f.funcao}</span>
            {!f.ativo && <Badge className="ml-2">Inativo</Badge>}
          </p>
          <p className="text-sm text-slate-600">
            Salário {formatarCentavos(f.salarioCentavos)} + encargos {formatarCentavos(f.encargosCentavos)} ={" "}
            <strong>{formatarCentavos(custoDoFuncionario(f.salarioCentavos, f.encargosCentavos))}</strong>
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" onClick={() => setEditando((v) => !v)}>
            Editar valores
          </Button>
          <Button variant="ghost" disabled={pendente} onClick={alternar}>
            {f.ativo ? "Desativar" : "Reativar"}
          </Button>
        </div>
      </div>
      {editando && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="space-y-1">
            <Label htmlFor={`sal-${f.id}`}>Salário (R$)</Label>
            <Input id={`sal-${f.id}`} inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`enc-${f.id}`}>Encargos (R$)</Label>
            <Input id={`enc-${f.id}`} inputMode="decimal" value={encargos} onChange={(e) => setEncargos(e.target.value)} className="w-36" />
          </div>
          <Button type="submit" disabled={pendente}>
            Salvar
          </Button>
        </form>
      )}
    </li>
  );
}

export function Equipe({ funcionarios }: { funcionarios: Funcionario[] }) {
  const [pendente, iniciar] = useTransition();

  function criar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const campo = (n: string) => String(dados.get(n) ?? "");
      const r = await criarFuncionarioAction({
        nome: campo("nome"),
        funcao: campo("funcao"),
        salario: campo("salario"),
        encargos: campo("encargos"),
      });
      if (!r.ok) toast.error(r.erro.mensagem);
      else {
        toast.success("Funcionário cadastrado.");
        form.reset();
      }
    });
  }

  return (
    <Card className="space-y-3">
      <CardTitle>Equipe</CardTitle>
      <p className="text-sm text-slate-500">
        Encargos = FGTS, INSS patronal, férias e 13º provisionados. Sem eles o lucro aparece maior do que é.
      </p>
      {funcionarios.length > 0 && <ul className="divide-y divide-slate-100">{funcionarios.map((f) => <LinhaFuncionario key={f.id} f={f} />)}</ul>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
      >
        <div className="space-y-1">
          <Label htmlFor="f-nome">Nome</Label>
          <Input id="f-nome" name="nome" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-funcao">Função</Label>
          <Input id="f-funcao" name="funcao" required placeholder="Operador" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-sal">Salário mensal (R$)</Label>
          <Input id="f-sal" name="salario" inputMode="decimal" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-enc">Encargos mensais (R$)</Label>
          <Input id="f-enc" name="encargos" inputMode="decimal" placeholder="0,00" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Adicionar funcionário
          </Button>
        </div>
      </form>
    </Card>
  );
}
