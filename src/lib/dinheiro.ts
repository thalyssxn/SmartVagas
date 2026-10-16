import { z } from "zod";

const formatadorBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// RN-11: todo valor monetário trafega e é gravado em centavos (inteiro).
export function formatarCentavos(centavos: number): string {
  return formatadorBRL.format(centavos / 100);
}

/** "12,50", "R$ 1.234,50" ou "12.5" → centavos. null se não for um valor válido. */
export function lerReais(texto: string): number | null {
  let limpo = texto.replace(/[R$\s]/g, "");
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(limpo)) limpo = limpo.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}

/** Para preencher um campo de edição: 1250 → "12,50". */
export function paraReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** Campo de valor digitado em reais, validado e convertido para centavos. */
export const reaisSchema = z.string().transform((texto, ctx) => {
  const valor = lerReais(texto);
  if (valor === null) {
    ctx.addIssue({ code: "custom", message: "Valor inválido. Use o formato 12,50." });
    return z.NEVER;
  }
  return valor;
});

/** Como reaisSchema, mas vazio ou ausente vale zero (ex.: encargos). */
export const reaisOpcionalSchema = z
  .string()
  .optional()
  .transform((texto, ctx) => {
    if (!texto?.trim()) return 0;
    const valor = lerReais(texto);
    if (valor === null) {
      ctx.addIssue({ code: "custom", message: "Valor inválido. Use o formato 12,50." });
      return z.NEVER;
    }
    return valor;
  });
