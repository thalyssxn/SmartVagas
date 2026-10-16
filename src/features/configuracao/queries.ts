import type { TabelaPreco } from "@/features/estadias/preco";
import type { RegrasReserva } from "@/features/reservas/regras";
import { env } from "@/lib/env";
import { diaCivil } from "@/lib/tempo";
import { prisma } from "@/server/db";

/** Tudo que uma operação precisa saber sobre "agora" e as regras do dono. */
export type Operacao = {
  fuso: string;
  agora: Date;
  hoje: string;
  tabela: TabelaPreco;
  alertaPermanenciaMin: number;
  carenciaDias: number;
  reservas: RegrasReserva & {
    expiracaoPendenteMin: number;
    bloqueioAvulsoH: number;
    chegadaAntecipadaMin: number;
    chavePix: string | null;
  };
};

export async function obterOperacao(estacionamentoId: string): Promise<Operacao> {
  const config = await prisma.configuracao.findUniqueOrThrow({ where: { estacionamentoId } });
  const agora = new Date();

  return {
    fuso: env.APP_TIMEZONE,
    agora,
    hoje: diaCivil(agora, env.APP_TIMEZONE),
    tabela: {
      toleranciaMin: config.toleranciaMin,
      primeiraHoraCentavos: config.primeiraHoraCentavos,
      horaAdicionalCentavos: config.horaAdicionalCentavos,
      diariaCentavos: config.diariaCentavos,
    },
    alertaPermanenciaMin: config.alertaPermanenciaH * 60,
    carenciaDias: config.carenciaMensalidadeDias,
    reservas: {
      antecedenciaMinMin: config.antecedenciaMinMin,
      antecedenciaMaxDias: config.antecedenciaMaxDias,
      duracaoMaxH: config.duracaoMaxH,
      cancelamentoPrazoH: config.cancelamentoPrazoH,
      retencaoPct: config.retencaoPct,
      expiracaoPendenteMin: config.expiracaoPendenteMin,
      bloqueioAvulsoH: config.bloqueioAvulsoH,
      chegadaAntecipadaMin: config.chegadaAntecipadaMin,
      chavePix: config.chavePix,
    },
  };
}
