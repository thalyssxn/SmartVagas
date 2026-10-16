"use client";

import { X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ConvenioNoGuiche } from "@/features/convenios/servico";
import { MapaVagas } from "@/features/vagas/components/mapa-vagas";
import type { VagaNoMapa } from "@/features/vagas/queries";
import { consultarAction } from "../actions";
import type { ConsultaPlaca } from "../consulta";
import type { TabelaPreco } from "../preco";
import { CampoPlaca } from "./campo-placa";
import { PainelEntrada } from "./painel-entrada";
import { PainelSaida } from "./painel-saida";

type Props = {
  vagas: VagaNoMapa[];
  agora: string;
  fuso: string;
  /** Vindo de "Quem está dentro" → abre direto a saída. */
  estadiaInicialId?: string;
  convenios: ConvenioNoGuiche[];
  tabela: TabelaPreco;
};

type Busca = { placa: string } | { estadiaId: string };

/** Tela principal do operador: um campo de placa decide entre entrada e saída (RF-04). */
export function Patio({ vagas, agora, fuso, estadiaInicialId, convenios, tabela }: Props) {
  const [placa, setPlaca] = useState("");
  const [consulta, setConsulta] = useState<ConsultaPlaca | null>(null);
  const [vagaEscolhida, setVagaEscolhida] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campoRef = useRef<HTMLInputElement>(null);

  function buscar(busca: Busca) {
    iniciar(async () => {
      const resultado = await consultarAction(busca);
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      const dados = resultado.dados;
      setConsulta(dados);
      if (dados.situacao === "dentro") {
        setPlaca(dados.estadia.placa);
      } else {
        // Vaga tocada no mapa antes da busca tem prioridade sobre a sugestão.
        setVagaEscolhida((atual) => atual ?? dados.vagaSugeridaId);
      }
    });
  }

  const abrirEstadia = useEffectEvent((estadiaId: string) => {
    // Tira o ?estadia= da URL: um F5 depois da saída não deve reabrir um carro que já saiu.
    window.history.replaceState(null, "", "/patio");
    buscar({ estadiaId });
  });
  useEffect(() => {
    if (estadiaInicialId) abrirEstadia(estadiaInicialId);
  }, [estadiaInicialId]);

  function recomecar() {
    setPlaca("");
    setConsulta(null);
    setVagaEscolhida(null);
    campoRef.current?.focus();
  }

  function aoClicarVaga(vaga: VagaNoMapa) {
    if (vaga.estadia) {
      setPlaca(vaga.estadia.placa);
      buscar({ estadiaId: vaga.estadia.id });
      return;
    }
    if (vaga.status === "bloqueada") {
      toast.info(
        `Vaga ${vaga.numero} bloqueada${vaga.motivoBloqueio ? `: ${vaga.motivoBloqueio}` : ""}.`,
      );
      return;
    }
    if (
      vaga.status === "reservada" &&
      !(consulta?.situacao === "fora" && consulta.vagaFixaId === vaga.id)
    ) {
      toast.info(
        vaga.mensalistaFixo
          ? `Vaga ${vaga.numero} é fixa de ${vaga.mensalistaFixo}.`
          : `Vaga ${vaga.numero} reservada para ${vaga.reserva?.placa}.`,
      );
      return;
    }
    setVagaEscolhida(vaga.id);
    if (consulta?.situacao !== "fora") campoRef.current?.focus();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
      <div className="space-y-4 lg:sticky lg:top-4">
        <CampoPlaca
          ref={campoRef}
          valor={placa}
          pendente={pendente}
          aoMudar={(valor) => {
            setPlaca(valor);
            setConsulta(null);
          }}
          aoEnviar={() => buscar({ placa })}
        />

        {consulta?.situacao === "dentro" && (
          <PainelSaida
            key={consulta.estadia.id}
            consulta={consulta}
            fuso={fuso}
            convenios={convenios}
            tabela={tabela}
            aoConcluir={recomecar}
          />
        )}
        {consulta?.situacao === "fora" && (
          <PainelEntrada
            key={consulta.placa}
            consulta={consulta}
            vagas={vagas}
            vagaId={vagaEscolhida}
            aoEscolherVaga={setVagaEscolhida}
            aoConcluir={recomecar}
          />
        )}
        {consulta && (
          <Button variant="ghost" className="w-full" onClick={recomecar}>
            <X aria-hidden />
            Cancelar
          </Button>
        )}
      </div>

      <MapaVagas
        vagas={vagas}
        agora={new Date(agora)}
        vagaSelecionadaId={consulta?.situacao === "dentro" ? null : vagaEscolhida}
        aoClicar={aoClicarVaga}
      />
    </div>
  );
}
