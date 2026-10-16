import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Map.groupBy ainda falta em navegadores de guichê desatualizados.
export function agruparPor<T, K>(itens: T[], chave: (item: T) => K): Map<K, T[]> {
  const grupos = new Map<K, T[]>();
  for (const item of itens) {
    const k = chave(item);
    const grupo = grupos.get(k);
    if (grupo) grupo.push(item);
    else grupos.set(k, [item]);
  }
  return grupos;
}
