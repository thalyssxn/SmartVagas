import { calcularValorEstadia, type TabelaPreco } from "@/features/estadias/preco";

const MIN_MS = 60_000;

export type Excedente = {
  /** Minutos que faltam para o fim da reserva (0 quando já passou). */
  minutosRestantes: number;
  /** Minutos além do horário reservado (0 enquanto não passou). */
  minutosExcedidos: number;
  /** Quanto a saída cobraria agora pelo excedente (mesma tabela do avulso, RN-05). */
  taxaCentavos: number;
};

/** Situação da reserva em relação ao horário de saída escolhido. Cliente e servidor usam a mesma conta. */
export function calcularExcedente(fim: Date, agora: Date, tabela: TabelaPreco): Excedente {
  const diferenca = Math.floor((agora.getTime() - fim.getTime()) / MIN_MS);
  if (diferenca <= 0) {
    return {
      minutosRestantes: Math.ceil((fim.getTime() - agora.getTime()) / MIN_MS),
      minutosExcedidos: 0,
      taxaCentavos: 0,
    };
  }
  return {
    minutosRestantes: 0,
    minutosExcedidos: diferenca,
    taxaCentavos: calcularValorEstadia(diferenca, tabela),
  };
}

/** Texto curto do aviso de taxa que aparece antes de reservar e no cartão da reserva. */
export function avisoTaxaAdicional(tabela: TabelaPreco): string {
  const reais = (c: number) =>
    (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const tolerancia =
    tabela.toleranciaMin > 0 ? ` depois de ${tabela.toleranciaMin} min de tolerância` : "";
  return `Passou do horário de saída? A partir daí cobra-se taxa adicional${tolerancia}: ${reais(tabela.primeiraHoraCentavos)} na primeira hora e ${reais(tabela.horaAdicionalCentavos)} por hora seguinte, pagos na saída.`;
}
