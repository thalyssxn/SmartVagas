import { TZDate } from "@date-fns/tz";
import { somarDias } from "@/lib/tempo";

/** Competência = mês no formato "2026-10". */
export function competenciaValida(texto: string | undefined): texto is string {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto ?? "");
}

/** [início, fim) do mês na hora local do estacionamento. */
export function limitesDoMes(competencia: string, fuso: string): { inicio: Date; fim: Date } {
  const [ano, mes] = competencia.split("-").map(Number);
  return {
    inicio: new Date(new TZDate(ano, mes - 1, 1, fuso).getTime()),
    fim: new Date(new TZDate(ano, mes, 1, fuso).getTime()),
  };
}

export function deslocarCompetencia(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  return data.toISOString().slice(0, 7);
}

export function ultimoDiaDoMes(competencia: string): string {
  return somarDias(`${deslocarCompetencia(competencia, 1)}-01`, -1);
}

export function nomeDoMes(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(ano, mes - 1, 1)),
  );
}
