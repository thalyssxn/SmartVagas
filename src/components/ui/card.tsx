import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "shadow-cartao rounded-[var(--radius-superficie)] border border-slate-900/8 bg-white p-4 sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-tinta text-lg font-bold tracking-tight", className)} {...props} />;
}

/** Título de página: condensado e grande, como o letreiro de uma placa. */
export function TituloPagina({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-tinta text-3xl leading-none font-bold tracking-tight sm:text-4xl">
          {titulo}
        </h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-slate-600">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
