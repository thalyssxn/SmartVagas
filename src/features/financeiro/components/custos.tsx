"use client";

import { FileSpreadsheet, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDia } from "@/lib/tempo";
import { criarCustoAction, excluirCustoAction, lancarFolhaAction } from "../actions";

type Custo = {
  id: string;
  categoria: string;
  descricao: string;
  valorCentavos: number;
  data: string;
  funcionarioId: string | null;
};

const CATEGORIAS = [
  ["aluguel", "Aluguel"],
  ["energia", "Energia"],
  ["agua", "Água"],
  ["manutencao", "Manutenção"],
  ["outros", "Outros"],
] as const;

const ROTULO: Record<string, string> = { folha: "Folha", ...Object.fromEntries(CATEGORIAS) };

function LinhaCusto({ custo }: { custo: Custo }) {
  const [pendente, iniciar] = useTransition();

  function excluir() {
    if (!window.confirm(`Excluir "${custo.descricao}"?`)) return;
    iniciar(async () => {
      const r = await excluirCustoAction(custo.id);
      if (!r.ok) toast.error(r.erro.mensagem);
    });
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <span className="w-12 text-sm text-slate-500">{formatarDia(custo.data)}</span>
      <Badge>{ROTULO[custo.categoria] ?? custo.categoria}</Badge>
      <span className="min-w-0 flex-1 truncate text-sm">{custo.descricao}</span>
      <span className="font-semibold tabular-nums">{formatarCentavos(custo.valorCentavos)}</span>
      <Button variant="ghost" size="icon" disabled={pendente} onClick={excluir} aria-label={`Excluir ${custo.descricao}`}>
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}

export function Custos({ custos, competencia, hoje }: { custos: Custo[]; competencia: string; hoje: string }) {
  const [pendente, iniciar] = useTransition();

  function criar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const campo = (n: string) => String(dados.get(n) ?? "");
      const r = await criarCustoAction({
        categoria: campo("categoria") as "aluguel",
        descricao: campo("descricao"),
        valor: campo("valor"),
        data: campo("data"),
      });
      if (!r.ok) toast.error(r.erro.mensagem);
      else {
        toast.success("Custo lançado.");
        form.reset();
      }
    });
  }

  function lancarFolha() {
    if (!window.confirm("Lançar a folha deste mês para os funcionários ativos?")) return;
    iniciar(async () => {
      const r = await lancarFolhaAction(competencia);
      if (!r.ok) {
        toast.error(r.erro.mensagem);
        return;
      }
      const { lancados, jaLancados } = r.dados;
      toast.success(
        lancados > 0
          ? `Folha lançada: ${lancados} funcionário(s)${jaLancados ? `, ${jaLancados} já estavam lançados` : ""}.`
          : "A folha deste mês já estava lançada.",
      );
    });
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Custos do mês</CardTitle>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={pendente} onClick={lancarFolha}>
            <Users aria-hidden />
            Lançar folha
          </Button>
          <a
            href={`/financeiro/exportar?mes=${competencia}`}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold hover:bg-slate-100"
          >
            <FileSpreadsheet className="size-5" aria-hidden />
            CSV
          </a>
        </div>
      </div>

      {custos.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">Nenhum custo lançado neste mês.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {custos.map((c) => (
            <LinhaCusto key={c.id} custo={c} />
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4"
      >
        <div className="space-y-1">
          <Label htmlFor="c-cat">Tipo</Label>
          <Select id="c-cat" name="categoria" defaultValue="aluguel">
            {CATEGORIAS.map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="c-desc">Descrição</Label>
          <Input id="c-desc" name="descricao" required maxLength={100} placeholder="Conta de luz de setembro" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-valor">Valor (R$)</Label>
          <Input id="c-valor" name="valor" inputMode="decimal" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-data">Data</Label>
          <Input id="c-data" name="data" type="date" required defaultValue={hoje} />
        </div>
        <div className="sm:col-span-3 sm:self-end">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Lançar custo
          </Button>
        </div>
      </form>
    </Card>
  );
}
