import { ChevronRight, ParkingSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import { obterEventoParaReserva } from "@/features/eventos/queries";
import { SeloLotacao } from "@/features/explorar/components/selo-lotacao";
import {
  listarEstacionamentosPublicos,
  obterEstacionamentoPublico,
} from "@/features/explorar/queries";
import { FormReserva } from "@/features/reservas/components/form-reserva";
import { listarVeiculosDoCliente } from "@/features/veiculos/servico";
import { formatarCentavos } from "@/lib/dinheiro";
import { paraHorarioLocal } from "@/lib/tempo";
import { exigirCliente } from "@/server/sessao";

export const metadata: Metadata = { title: "Reservar vaga" };

const HORA_MS = 3_600_000;
const FOLGA_EVENTO_MS = 30 * 60_000;

export default async function PaginaReservar({ searchParams }: PageProps<"/cliente/reservar">) {
  const cliente = await exigirCliente("/cliente/reservar");
  const { estacionamento: estId, evento: eventoId } = await searchParams;
  const veiculos = await listarVeiculosDoCliente(cliente.usuarioId);

  if (veiculos.length === 0) {
    return (
      <Card className="space-y-3 py-8 text-center">
        <p className="text-lg font-semibold">Cadastre um veículo antes de reservar.</p>
        <p className="text-slate-600">É pela placa que o guichê reconhece a sua reserva.</p>
        <Link href="/cliente/veiculos" className={buttonVariants({ variant: "destaque" })}>
          Adicionar veículo
        </Link>
      </Card>
    );
  }

  const estacionamento = typeof estId === "string" ? await obterEstacionamentoPublico(estId) : null;

  // Sem estacionamento escolhido: lista os que aceitam reserva.
  if (!estacionamento || !estacionamento.aceitaReserva) {
    const opcoes = (await listarEstacionamentosPublicos()).filter((e) => e.aceitaReserva);
    return (
      <div className="space-y-5">
        <TituloPagina
          titulo="Reservar vaga"
          descricao="Escolha onde estacionar. Para ver por distância, use a busca."
        />
        {opcoes.length === 0 ? (
          <Card>
            <Vazio Icone={ParkingSquare} titulo="Nenhum estacionamento aceitando reservas agora" />
          </Card>
        ) : (
          <ul className="space-y-3">
            {opcoes.map((e) => (
              <li key={e.id}>
                <Link href={`/cliente/reservar?estacionamento=${e.id}`} className="block">
                  <Card className="flex items-center gap-3 transition hover:border-slate-400">
                    <div className="min-w-0 flex-1">
                      <SeloLotacao lotacao={e.lotacao} />
                      <p className="mt-1 text-lg font-bold">{e.nome}</p>
                      <p className="truncate text-sm text-slate-600">{e.endereco}</p>
                    </div>
                    <p className="text-right text-sm text-slate-600">
                      1ª hora
                      <span className="font-display text-tinta block text-2xl font-bold">
                        {formatarCentavos(e.precos.primeiraHoraCentavos)}
                      </span>
                    </p>
                    <ChevronRight className="size-5 text-slate-400" aria-hidden />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/explorar" className={buttonVariants({ variant: "secondary" })}>
          Buscar por distância
        </Link>
      </div>
    );
  }

  const op = await obterOperacao(estacionamento.id);
  const evento =
    typeof eventoId === "string" ? await obterEventoParaReserva(eventoId, estacionamento.id) : null;

  // Sugestão: começa na antecedência mínima (meia hora redonda) e dura 2 h; para evento, a janela dele com folga.
  const meiaHoraMs = HORA_MS / 2;
  const minimo =
    Math.ceil((op.agora.getTime() + op.reservas.antecedenciaMinMin * 60_000) / meiaHoraMs) *
    meiaHoraMs;
  let inicio = new Date(minimo);
  let fim = new Date(inicio.getTime() + 2 * HORA_MS);
  if (evento) {
    inicio = new Date(Math.max(evento.inicioEm.getTime() - FOLGA_EVENTO_MS, minimo));
    fim = new Date(
      Math.min(
        evento.fimEm.getTime() + FOLGA_EVENTO_MS,
        inicio.getTime() + op.reservas.duracaoMaxH * HORA_MS,
      ),
    );
  }

  return (
    <div className="space-y-5">
      <TituloPagina
        titulo="Reservar vaga"
        descricao={
          <>
            em <strong className="text-tinta">{estacionamento.nome}</strong> ·{" "}
            {estacionamento.endereco}{" "}
            <Link
              href="/cliente/reservar"
              className="text-primaria ml-1 font-semibold hover:underline"
            >
              Trocar
            </Link>
          </>
        }
      />
      <FormReserva
        estacionamento={{
          id: estacionamento.id,
          nome: estacionamento.nome,
          endereco: estacionamento.endereco,
        }}
        veiculos={veiculos}
        inicioPadrao={paraHorarioLocal(inicio, op.fuso)}
        fimPadrao={paraHorarioLocal(fim, op.fuso)}
        duracaoMaxH={op.reservas.duracaoMaxH}
        antecedenciaMaxDias={op.reservas.antecedenciaMaxDias}
        tabela={op.tabela}
        evento={evento && { id: evento.id, nome: evento.nome }}
      />
    </div>
  );
}
