import { TZDate } from "@date-fns/tz";
import { startOfDay } from "date-fns";

// Dias civis (vencimentos, datas de custo) circulam como "AAAA-MM-DD".
// Instantes (entrada, saída) circulam como Date em UTC e só viram hora local na exibição.

export function diaCivil(instante: Date, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

export function inicioDoDia(instante: Date, fuso: string): Date {
  return new Date(startOfDay(new TZDate(instante, fuso)).getTime());
}

export function diaParaData(dia: string): Date {
  return new Date(`${dia}T00:00:00Z`);
}

export function dataParaDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number): string {
  const data = diaParaData(dia);
  data.setUTCDate(data.getUTCDate() + dias);
  return dataParaDia(data);
}

/** Mesmo dia N meses depois; se o mês não tiver esse dia, usa o último (31/01 + 1 = 28/02). */
export function somarMeses(dia: string, meses: number): string {
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  const ultimoDiaDoMesAlvo = new Date(Date.UTC(ano, mes - 1 + meses + 1, 0)).getUTCDate();
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, Math.min(diaDoMes, ultimoDiaDoMesAlvo)));
  return dataParaDia(alvo);
}

export function minutosEntre(inicio: Date, fim: Date): number {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 60_000));
}

export function formatarHora(instante: Date, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(instante);
}

export function formatarDataHora(instante: Date, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instante);
}

/** "2026-10-12" → "12/10". */
export function formatarDia(dia: string): string {
  const [, mes, diaDoMes] = dia.split("-");
  return `${diaDoMes}/${mes}`;
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const min = minutos % 60;
  const horasMin = `${horas}h${String(min).padStart(2, "0")}`;
  return dias > 0 ? `${dias}d ${horasMin}` : horasMin;
}

/** "2026-10-05T14:30" (campo datetime-local) lido como hora de parede no fuso do estacionamento. */
export function lerHorarioLocal(texto: string, fuso: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(texto);
  if (!partes) return null;
  const [ano, mes, dia, hora, minuto] = partes.slice(1).map(Number);
  const data = new TZDate(ano, mes - 1, dia, hora, minuto, 0, fuso);
  return Number.isNaN(data.getTime()) ? null : new Date(data.getTime());
}

/** Inverso de lerHorarioLocal, para preencher o campo datetime-local. */
export function paraHorarioLocal(instante: Date, fuso: string): string {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instante);
  return p.replace(" ", "T");
}
