import type { LucideIcon } from "lucide-react";

/** Estado vazio com ícone: uma lista sem itens ainda precisa dizer o que fazer. */
export function Vazio({
  Icone,
  titulo,
  dica,
  children,
}: {
  Icone: LucideIcon;
  titulo: string;
  dica?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="bg-concreto grid size-12 place-items-center rounded-xl text-slate-500">
        <Icone className="size-6" aria-hidden />
      </span>
      <p className="font-semibold text-slate-800">{titulo}</p>
      {dica && <p className="max-w-xs text-sm text-slate-500">{dica}</p>}
      {children}
    </div>
  );
}
