import { z } from "zod";

// RN-12: cobre o formato antigo (ABC1234) e o Mercosul (ABC1D23).
const FORMATO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function normalizarPlaca(entrada: string): string {
  return entrada.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function placaValida(placa: string): boolean {
  return FORMATO_PLACA.test(placa);
}

export const placaSchema = z
  .string()
  .transform(normalizarPlaca)
  .refine(placaValida, { message: "Placa inválida. Use ABC1234 ou ABC1D23." });
