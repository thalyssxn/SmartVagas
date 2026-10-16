import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Input> & { id: string; rotulo: string; dica?: string };

/** Rótulo + campo + dica: o formulário do dono tem dezenas deles. */
export function Campo({ id, rotulo, dica, className, ...props }: Props) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} name={id} {...props} />
      {dica && <p className="text-xs text-slate-500">{dica}</p>}
    </div>
  );
}
