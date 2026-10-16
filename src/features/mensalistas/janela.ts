export const NOMES_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** "18:30" → 1110. null se vazio ou inválido. */
export function hhmmParaMinutos(texto: string | undefined): number | null {
  const partes = /^(\d{2}):(\d{2})$/.exec(texto ?? "");
  if (!partes) return null;
  const [h, m] = [Number(partes[1]), Number(partes[2])];
  return h < 24 && m < 60 ? h * 60 + m : null;
}

export function minutosParaHhmm(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

/** Resumo legível de um plano: "Todos os dias, 18:00–08:00" ou "Sáb e Dom". */
export function descreverJanela(plano: {
  diasSemana: number[];
  inicioMin: number | null;
  fimMin: number | null;
}): string {
  const dias = [...plano.diasSemana].sort();
  const textoDias =
    dias.length === 7 ? "Todos os dias" : dias.map((d) => NOMES_DIAS[d]).join(", ");
  if (plano.inicioMin === null || plano.fimMin === null) return textoDias;
  return `${textoDias}, ${minutosParaHhmm(plano.inicioMin)}–${minutosParaHhmm(plano.fimMin)}`;
}
