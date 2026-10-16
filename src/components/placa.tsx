import { cn } from "@/lib/utils";

const TAMANHOS = {
  sm: { caixa: "rounded", faixa: "px-1.5 py-px text-[6px]", texto: "px-1.5 py-0.5 text-sm" },
  md: { caixa: "rounded-md", faixa: "px-2 py-0.5 text-[7px]", texto: "px-2.5 py-0.5 text-lg" },
} as const;

/** Placa estilo Mercosul: o operador reconhece o carro pela placa, então ela é o rótulo. */
export function Placa({
  valor,
  tamanho = "sm",
  className,
}: {
  valor: string;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
}) {
  const t = TAMANHOS[tamanho];
  return (
    <span
      className={cn(
        "inline-flex flex-col overflow-hidden border border-slate-800 bg-white text-center align-middle font-mono font-bold text-slate-900 shadow-sm",
        t.caixa,
        className,
      )}
    >
      <span className={cn("block bg-placa leading-none font-sans font-bold tracking-[0.3em] text-white", t.faixa)}>
        BRASIL
      </span>
      <span className={cn("block leading-tight tracking-[0.12em]", t.texto)}>{valor}</span>
    </span>
  );
}
