import type { TipoVaga, TipoVeiculo } from "@/generated/prisma/enums";

export const TIPOS_VAGA = [
  "comum",
  "eletrica",
  "grande",
  "moto",
  "pcd",
  "idoso",
] as const satisfies readonly TipoVaga[];
export const TIPOS_VEICULO = ["carro", "moto", "grande"] as const satisfies readonly TipoVeiculo[];

export const ROTULO_TIPO_VAGA: Record<TipoVaga, string> = {
  comum: "Comum",
  pcd: "PCD",
  idoso: "Idoso",
  moto: "Moto",
  eletrica: "Recarga elétrica",
  grande: "Veículo grande",
};

export const ROTULO_TIPO_VEICULO: Record<TipoVeiculo, string> = {
  carro: "Carro",
  moto: "Moto",
  grande: "Caminhonete / SUV",
};

/**
 * Em que vaga cada veículo cabe. Carro usa a comum, a de recarga e a grande (sobra espaço);
 * caminhonete e SUV grande só cabem na grande; moto só na de moto.
 * PCD e idoso ficam de fora: são vagas por direito da pessoa, escolhidas na hora da reserva.
 */
export const VAGAS_DO_VEICULO: Record<TipoVeiculo, TipoVaga[]> = {
  carro: ["comum", "eletrica", "grande"],
  moto: ["moto"],
  grande: ["grande"],
};

export function vagaServeParaVeiculo(vaga: TipoVaga, veiculo: TipoVeiculo): boolean {
  return VAGAS_DO_VEICULO[veiculo].includes(vaga);
}

/** Conta vagas por tipo de veículo a partir de uma contagem por tipo de vaga. */
export function contarPorVeiculo(
  porTipoVaga: Partial<Record<TipoVaga, number>>,
): Record<TipoVeiculo, number> {
  const total = (tipos: TipoVaga[]) =>
    tipos.reduce((soma, tipo) => soma + (porTipoVaga[tipo] ?? 0), 0);
  return {
    carro: total(VAGAS_DO_VEICULO.carro),
    moto: total(VAGAS_DO_VEICULO.moto),
    grande: total(VAGAS_DO_VEICULO.grande),
  };
}

export type Lotacao = "livre" | "quase_lotado" | "lotado";

/** "Quase lotado" a partir de 85% ocupado ou com 3 vagas ou menos. */
export function lotacao(livres: number, total: number): Lotacao {
  if (total === 0 || livres <= 0) return "lotado";
  if (livres <= 3 || livres / total <= 0.15) return "quase_lotado";
  return "livre";
}
