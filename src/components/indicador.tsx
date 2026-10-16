import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONS = {
  azul: "text-primaria",
  verde: "text-livre",
  ambar: "text-faixa-escura",
  cinza: "text-slate-500",
  vermelho: "text-alerta",
} as const;

type Props = {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  Icone: LucideIcon;
  tom?: keyof typeof TONS;
  className?: string;
};

export function Indicador({ rotulo, valor, detalhe, Icone, tom = "azul", className }: Props) {
  return (
    <Card className={cn("flex flex-col gap-1", className)}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
        <Icone className={cn("size-4", TONS[tom])} aria-hidden />
        {rotulo}
      </p>
      <p className="font-display text-4xl leading-none font-bold tracking-tight tabular-nums">
        {valor}
      </p>
      {detalhe && <p className="text-sm text-slate-500">{detalhe}</p>}
    </Card>
  );
}
