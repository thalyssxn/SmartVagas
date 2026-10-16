import { tz } from "@date-fns/tz";
import { addDays, set, startOfDay } from "date-fns";

export type JanelaPlano = {
  /** 0 = domingo … 6 = sábado; é o dia em que a janela começa. */
  diasSemana: number[];
  /** Minutos desde 00:00. null nos dois = dia inteiro. */
  inicioMin: number | null;
  /** Se fim <= início, a janela atravessa a meia-noite (ex.: noturno 18:00–08:00). */
  fimMin: number | null;
};

/** Parte da estadia que o plano não cobre e, portanto, é cobrada como avulso (RN-05). */
export function minutosForaDoPlano(
  entrada: Date,
  saida: Date,
  janela: JanelaPlano,
  fuso: string,
): number {
  const totalMs = Math.max(0, saida.getTime() - entrada.getTime());
  const cobertoMs = msCobertos(entrada, saida, janela, fuso);
  return Math.floor((totalMs - cobertoMs) / 60_000);
}

function msCobertos(entrada: Date, saida: Date, janela: JanelaPlano, fuso: string): number {
  const noFuso = tz(fuso);
  // Começa um dia antes: a janela noturna de ontem pode cobrir o começo da estadia.
  let dia = addDays(startOfDay(entrada, { in: noFuso }), -1, { in: noFuso });
  let coberto = 0;

  while (dia.getTime() < saida.getTime()) {
    if (janela.diasSemana.includes(dia.getDay())) {
      const [inicio, fim] = limitesDaJanela(dia, janela);
      coberto += sobreposicaoMs(entrada, saida, inicio, fim);
    }
    dia = addDays(dia, 1, { in: noFuso });
  }
  return coberto;
}

function limitesDaJanela(dia: Date, janela: JanelaPlano): [Date, Date] {
  if (janela.inicioMin === null || janela.fimMin === null) {
    return [dia, addDays(dia, 1)];
  }
  const inicio = emMinutoDoDia(dia, janela.inicioMin);
  const diaDoFim = janela.fimMin <= janela.inicioMin ? addDays(dia, 1) : dia;
  return [inicio, emMinutoDoDia(diaDoFim, janela.fimMin)];
}

function emMinutoDoDia(dia: Date, minutos: number): Date {
  return set(dia, { hours: Math.floor(minutos / 60), minutes: minutos % 60, seconds: 0 });
}

function sobreposicaoMs(a0: Date, a1: Date, b0: Date, b1: Date): number {
  const inicio = Math.max(a0.getTime(), b0.getTime());
  const fim = Math.min(a1.getTime(), b1.getTime());
  return Math.max(0, fim - inicio);
}
