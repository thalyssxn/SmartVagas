import type { StatusVaga } from "./status-vaga";

export type VagaCandidata = {
  id: string;
  tipo: string;
  reservavel: boolean;
  status: StatusVaga;
};

/**
 * RF-04: mensalista vai para a vaga fixa dele; os demais para uma comum, preferindo as
 * não-reserváveis (para não gastar vaga que o dono liberou para reserva).
 * PCD, idoso, moto e elétrica o operador escolhe na mão.
 */
export function sugerirVaga(vagas: VagaCandidata[], vagaFixaId: string | null): string | null {
  if (vagaFixaId) {
    const fixa = vagas.find((vaga) => vaga.id === vagaFixaId);
    if (fixa && (fixa.status === "livre" || fixa.status === "reservada")) return fixa.id;
  }

  const comunsLivres = vagas.filter((vaga) => vaga.status === "livre" && vaga.tipo === "comum");
  return (comunsLivres.find((vaga) => !vaga.reservavel) ?? comunsLivres[0])?.id ?? null;
}
