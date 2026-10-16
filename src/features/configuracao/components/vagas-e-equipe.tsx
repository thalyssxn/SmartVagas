"use client";

import { Crosshair, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Campo } from "@/components/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ROTULO_TIPO_VAGA } from "@/lib/veiculo";
import {
  ajustarVagaAction,
  atualizarEstacionamentoAction,
  criarOperadorAction,
  criarVagaAction,
  excluirVagaAction,
} from "../actions";

type Vaga = {
  id: string;
  numero: string;
  tipo: string;
  setor: string | null;
  ativa: boolean;
  reservavel: boolean;
  motivoBloqueio: string | null;
};

const ROTULO_TIPO: Record<string, string> = ROTULO_TIPO_VAGA;

function LinhaVaga({ vaga }: { vaga: Vaga }) {
  const [ativa, setAtiva] = useState(vaga.ativa);
  const [reservavel, setReservavel] = useState(vaga.reservavel);
  const [motivo, setMotivo] = useState(vaga.motivoBloqueio ?? "");
  const [pendente, iniciar] = useTransition();
  const mudou =
    ativa !== vaga.ativa ||
    reservavel !== vaga.reservavel ||
    motivo !== (vaga.motivoBloqueio ?? "");

  function salvar() {
    iniciar(async () => {
      const r = await ajustarVagaAction({
        vagaId: vaga.id,
        ativa,
        reservavel,
        motivoBloqueio: motivo,
      });
      if (!r.ok) toast.error(r.erro.mensagem);
      else toast.success(`Vaga ${vaga.numero} atualizada.`);
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir a vaga ${vaga.numero}?`)) return;
    iniciar(async () => {
      const r = await excluirVagaAction(vaga.id);
      if (!r.ok) toast.error(r.erro.mensagem);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
      <span className="w-14 font-bold">{vaga.numero}</span>
      <Badge>{ROTULO_TIPO[vaga.tipo] ?? vaga.tipo}</Badge>
      <label className="flex h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={ativa}
          onChange={(e) => setAtiva(e.target.checked)}
        />
        Ativa
      </label>
      <label className="flex h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={reservavel}
          onChange={(e) => setReservavel(e.target.checked)}
        />
        Reservável
      </label>
      {!ativa && (
        <Input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo do bloqueio"
          maxLength={80}
          className="w-52"
          aria-label={`Motivo do bloqueio da vaga ${vaga.numero}`}
        />
      )}
      <div className="ml-auto flex gap-1">
        {mudou && (
          <Button disabled={pendente} onClick={salvar}>
            <Save aria-hidden />
            Salvar
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          disabled={pendente}
          onClick={excluir}
          aria-label={`Excluir vaga ${vaga.numero}`}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}

export function GerenciarVagas({ vagas }: { vagas: Vaga[] }) {
  const [pendente, iniciar] = useTransition();

  function criar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const c = (n: string) => String(dados.get(n) ?? "");
      const r = await criarVagaAction({
        numero: c("numero"),
        tipo: c("tipo") as "comum",
        setor: c("setor"),
        coberta: dados.get("coberta") === "on",
        reservavel: dados.get("reservavel") === "on",
      });
      if (!r.ok) toast.error(r.erro.mensagem);
      else {
        toast.success("Vaga criada.");
        form.reset();
      }
    });
  }

  return (
    <Card id="vagas" className="scroll-mt-20 space-y-3">
      <CardTitle>Vagas ({vagas.length})</CardTitle>
      <p className="text-sm text-slate-500">
        Vaga reservável aparece para o motorista. Desligar não cancela reservas já feitas. Vagas com
        histórico só podem ser bloqueadas.
      </p>
      <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
        {vagas.map((vaga) => (
          <LinhaVaga key={vaga.id} vaga={vaga} />
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4"
      >
        <Campo id="numero" rotulo="Número" required maxLength={10} placeholder="B-27" />
        <div className="space-y-1">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue="comum">
            {Object.entries(ROTULO_TIPO).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </Select>
        </div>
        <Campo id="setor" rotulo="Setor (opcional)" maxLength={40} className="sm:col-span-2" />
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="coberta" className="size-5" />
          Coberta
        </label>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="reservavel" className="size-5" />
          Reservável
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Adicionar vaga
          </Button>
        </div>
      </form>
    </Card>
  );
}

type DadosEstacionamento = {
  nome: string;
  endereco: string;
  cidade: string | null;
  telefone: string | null;
  horario: string | null;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  publicado: boolean;
};

export function FormEstacionamento(e: DadosEstacionamento) {
  const [pendente, iniciar] = useTransition();
  const [latitude, setLatitude] = useState(e.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(e.longitude?.toString() ?? "");
  const [publicado, setPublicado] = useState(e.publicado);

  function salvar(dados: FormData) {
    iniciar(async () => {
      const c = (n: string) => String(dados.get(n) ?? "");
      const r = await atualizarEstacionamentoAction({
        nome: c("nome"),
        endereco: c("endereco"),
        cidade: c("cidade"),
        telefone: c("telefone"),
        horario: c("horario"),
        descricao: c("descricao"),
        latitude,
        longitude,
        publicado,
      });
      if (!r.ok) toast.error(r.erro.mensagem);
      else
        toast.success(
          publicado
            ? "Salvo. O estacionamento aparece na busca dos motoristas."
            : "Salvo. O estacionamento está fora da busca.",
        );
    });
  }

  function usarLocalAtual() {
    if (!("geolocation" in navigator)) {
      toast.error("Este navegador não informa a localização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLatitude(p.coords.latitude.toFixed(6));
        setLongitude(p.coords.longitude.toFixed(6));
        toast.success("Localização preenchida. Confira e salve.");
      },
      () => toast.error("Não deu para pegar a localização. Copie as coordenadas do Google Maps."),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Estacionamento</CardTitle>
          <p className="text-sm text-slate-500">
            É isso que o motorista vê na busca e na página do estacionamento.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={publicado}
            onChange={(ev) => setPublicado(ev.target.checked)}
          />
          <span
            className="peer-checked:bg-livre relative h-6 w-11 rounded-full bg-slate-300 transition after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
            aria-hidden
          />
          <span className="text-sm font-semibold">
            {publicado ? "Aparece na busca" : "Fora da busca"}
          </span>
        </label>
      </div>
      <form action={salvar} className="grid gap-3 sm:grid-cols-2">
        <Campo id="nome" rotulo="Nome" defaultValue={e.nome} required />
        <Campo id="telefone" rotulo="Telefone" defaultValue={e.telefone ?? ""} inputMode="tel" />
        <Campo
          id="endereco"
          rotulo="Endereço"
          defaultValue={e.endereco}
          required
          className="sm:col-span-2"
        />
        <Campo id="cidade" rotulo="Cidade" defaultValue={e.cidade ?? ""} />
        <Campo
          id="horario"
          rotulo="Horário de funcionamento"
          defaultValue={e.horario ?? ""}
          placeholder="Seg-Sex 7h-20h"
        />
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="descricao">Descrição para o motorista</Label>
          <Textarea
            id="descricao"
            name="descricao"
            defaultValue={e.descricao ?? ""}
            maxLength={240}
            placeholder="Ex.: Coberto, com manobrista, a 2 quadras da catedral."
          />
        </div>
        <fieldset className="bg-concreto grid gap-3 rounded-xl p-3 sm:col-span-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <legend className="sr-only">Localização no mapa</legend>
          <div className="space-y-1">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              value={latitude}
              onChange={(ev) => setLatitude(ev.target.value)}
              inputMode="decimal"
              placeholder="-23.5015"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              value={longitude}
              onChange={(ev) => setLongitude(ev.target.value)}
              inputMode="decimal"
              placeholder="-47.4526"
            />
          </div>
          <Button variant="secondary" onClick={usarLocalAtual}>
            <Crosshair aria-hidden />
            Estou no estacionamento
          </Button>
          <p className="text-xs text-slate-500 sm:col-span-3">
            Usada para mostrar a distância em km ao motorista. No Google Maps, clique com o botão
            direito no local para copiar as coordenadas.
          </p>
        </fieldset>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            Salvar estacionamento
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function Operadores({
  operadores,
}: {
  operadores: { id: string; name: string; email: string }[];
}) {
  const [pendente, iniciar] = useTransition();

  function criar(dados: FormData, form: HTMLFormElement) {
    iniciar(async () => {
      const c = (n: string) => String(dados.get(n) ?? "");
      const r = await criarOperadorAction({
        nome: c("nome"),
        email: c("email"),
        senha: c("senha"),
      });
      if (!r.ok) toast.error(r.erro.mensagem);
      else {
        toast.success("Operador criado. Passe o e-mail e a senha para ele.");
        form.reset();
      }
    });
  }

  return (
    <Card className="space-y-3">
      <CardTitle>Operadores</CardTitle>
      <p className="text-sm text-slate-500">
        Operador dá entrada e saída, recebe mensalidade e fecha o próprio caixa. Não vê salário,
        lucro nem edita preços.
      </p>
      <ul className="divide-y divide-slate-100">
        {operadores.map((o) => (
          <li key={o.id} className="py-2 text-sm">
            <span className="font-semibold">{o.name}</span>{" "}
            <span className="text-slate-500">· {o.email}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar(new FormData(e.currentTarget), e.currentTarget);
        }}
        className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3"
      >
        <Campo id="nome" rotulo="Nome" required />
        <Campo id="email" rotulo="E-mail" type="email" required autoComplete="off" />
        <Campo
          id="senha"
          rotulo="Senha (mín. 8)"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
        <div className="sm:col-span-3">
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Criar operador
          </Button>
        </div>
      </form>
    </Card>
  );
}
