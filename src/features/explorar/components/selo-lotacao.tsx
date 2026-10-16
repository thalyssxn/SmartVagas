import { CircleAlert, CircleCheck, CircleSlash } from "lucide-react";
import type { Lotacao } from "@/lib/veiculo";
import { cn } from "@/lib/utils";

const ESTILO: Record<Lotacao, { texto: string; classe: string; Icone: typeof CircleCheck }> = {
  livre: { texto: "Com vagas", classe: "bg-green-100 text-green-900", Icone: CircleCheck },
  quase_lotado: {
    texto: "Quase lotado",
    classe: "bg-amber-100 text-amber-950",
    Icone: CircleAlert,
  },
  lotado: { texto: "Lotado agora", classe: "bg-alerta text-white", Icone: CircleSlash },
};

/** Cor + ícone + texto, como no mapa de vagas: dá para ler no sol e sem distinguir cores. */
export function SeloLotacao({ lotacao, className }: { lotacao: Lotacao; className?: string }) {
  const { texto, classe, Icone } = ESTILO[lotacao];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold",
        classe,
        className,
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      {texto}
    </span>
  );
}
