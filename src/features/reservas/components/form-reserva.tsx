"use client";

import { CalendarDays, CircleSlash, Info, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import type { TabelaPreco } from "@/features/estadias/preco";
import { BotaoAviseMe } from "@/features/explorar/components/botao-avise-me";
import type { TipoVaga, TipoVeiculo } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import { ROTULO_TIPO_VAGA, ROTULO_TIPO_VEICULO, vagaServeParaVeiculo } from "@/lib/veiculo";
import { buscarDisponibilidadeAction, criarReservaAction } from "../actions";
import { avisoTaxaAdicional } from "../excedente";
import type { Disponibilidade } from "../servico";

type Props = {
  estacionamento: { id: string; nome: string; endereco: string };
  veiculos: { placa: string; modelo: string | null; tipo: TipoVeiculo }[];
  inicioPadrao: string;
  fimPadrao: string;
  duracaoMaxH: number;
  antecedenciaMaxDias: number;
  tabela: TabelaPreco;
  evento: { id: string; nome: string } | null;
};

const DESCRICAO_TIPO: Partial<Record<TipoVaga, string>> = {
  pcd: "Exclusiva para pessoa com deficiência (credencial no painel).",
  idoso: "Exclusiva para pessoa com 60 anos ou mais (credencial no painel).",
  eletrica: "Com tomada de recarga para carro elétrico.",
  grande: "Mais larga e comprida: caminhonete, SUV grande ou van.",
};

function serveParaVeiculo(tipo: TipoVaga, veiculo: TipoVeiculo) {
  return (
    vagaServeParaVeiculo(tipo, veiculo) ||
    (veiculo === "carro" && (tipo === "pcd" || tipo === "idoso"))
  );
}

export function FormReserva({
  estacionamento,
  veiculos,
  inicioPadrao,
  fimPadrao,
  duracaoMaxH,
  antecedenciaMaxDias,
  tabela,
  evento,
}: Props) {
  const router = useRouter();
  const [placa, setPlaca] = useState(veiculos[0].placa);
  const [inicio, setInicio] = useState(inicioPadrao);
  const [fim, setFim] = useState(fimPadrao);
  const [opcoes, setOpcoes] = useState<Disponibilidade[] | null>(null);
  const [buscando, buscar] = useTransition();
  const [reservando, reservar] = useTransition();
  const veiculo = veiculos.find((v) => v.placa === placa) ?? veiculos[0];
  const compativeis = opcoes?.filter((o) => serveParaVeiculo(o.tipo, veiculo.tipo)) ?? null;

  function mudarPeriodo(atualiza: () => void) {
    atualiza();
    setOpcoes(null);
  }

  function verDisponibilidade() {
    buscar(async () => {
      const resultado = await buscarDisponibilidadeAction({
        estacionamentoId: estacionamento.id,
        inicio,
        fim,
      });
      if (!resultado.ok) {
        setOpcoes(null);
        toast.error(resultado.erro.mensagem);
        return;
      }
      setOpcoes(resultado.dados);
    });
  }

  function confirmar(tipo: TipoVaga) {
    reservar(async () => {
      const resultado = await criarReservaAction({
        estacionamentoId: estacionamento.id,
        inicio,
        fim,
        placa,
        tipo,
        eventoId: evento?.id,
      });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        if (resultado.erro.codigo === "sem_vaga") setOpcoes([]);
        return;
      }
      toast.success(`Reserva ${resultado.dados.codigo} criada. Falta pagar.`);
      router.push(`/cliente/reservas#${resultado.dados.id}`);
    });
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        {evento && (
          <p className="bg-faixa/15 text-tinta ring-faixa/60 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ring-1">
            <CalendarDays className="text-faixa-escura size-4" aria-hidden />
            Reserva para o evento {evento.nome}. Horário já preenchido com folga para chegar.
          </p>
        )}
        <div className="space-y-1">
          <Label htmlFor="placa">Veículo</Label>
          <Select
            id="placa"
            value={placa}
            onChange={(e) => {
              setPlaca(e.target.value);
            }}
          >
            {veiculos.map((v) => (
              <option key={v.placa} value={v.placa}>
                {v.placa} · {ROTULO_TIPO_VEICULO[v.tipo]}
                {v.modelo ? ` · ${v.modelo}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="inicio">Chegada</Label>
            <Input
              id="inicio"
              type="datetime-local"
              step={900}
              value={inicio}
              onChange={(e) => mudarPeriodo(() => setInicio(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fim">Saída</Label>
            <Input
              id="fim"
              type="datetime-local"
              step={900}
              value={fim}
              onChange={(e) => mudarPeriodo(() => setFim(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Até {duracaoMaxH} horas por reserva, com até {antecedenciaMaxDias} dias de antecedência.
        </p>
        <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {avisoTaxaAdicional(tabela)}
        </p>
        <Button className="w-full" size="lg" disabled={buscando} onClick={verDisponibilidade}>
          {buscando ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
          Ver vagas disponíveis
        </Button>
      </Card>

      {compativeis && compativeis.length === 0 && (
        <Card className="space-y-3 border-red-200 bg-red-50/60 text-center">
          <CircleSlash className="text-alerta mx-auto size-8" aria-hidden />
          <CardTitle>Esgotado nesse horário</CardTitle>
          <p className="text-sm text-slate-600">
            {opcoes && opcoes.length > 0
              ? `Ainda há vagas, mas nenhuma serve para ${ROTULO_TIPO_VEICULO[veiculo.tipo].toLowerCase()}.`
              : "Todas as vagas reserváveis já estão tomadas."}{" "}
            Tente outro horário, outro estacionamento ou peça um aviso.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <BotaoAviseMe estacionamentoId={estacionamento.id} logado />
            <Link href="/explorar" className={buttonVariants({ variant: "ghost" })}>
              Ver outros estacionamentos
            </Link>
          </div>
        </Card>
      )}

      {compativeis?.map((opcao) => (
        <Card key={opcao.tipo} className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Vaga {ROTULO_TIPO_VAGA[opcao.tipo].toLowerCase()}</CardTitle>
            {DESCRICAO_TIPO[opcao.tipo] && (
              <p className="text-sm text-slate-500">{DESCRICAO_TIPO[opcao.tipo]}</p>
            )}
            <p className="text-sm text-slate-600">
              {opcao.disponiveis} {opcao.disponiveis === 1 ? "disponível" : "disponíveis"}
              {opcao.disponiveis <= 2 && (
                <strong className="text-alerta ml-1">· últimas vagas</strong>
              )}
            </p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {formatarCentavos(opcao.valorCentavos)}
            </p>
          </div>
          <Button
            size="lg"
            variant="destaque"
            disabled={reservando}
            onClick={() => confirmar(opcao.tipo)}
          >
            {reservando && <Loader2 className="animate-spin" aria-hidden />}
            Reservar
          </Button>
        </Card>
      ))}
    </div>
  );
}
