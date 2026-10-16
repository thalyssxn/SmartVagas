import { cn } from "@/lib/utils";

/** Marca: placa azul de estacionamento com o "P" e a faixa amarela pintada embaixo. */
export function LogoMarca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#1f4fd6" />
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="5.5"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M12.5 22.5V9.5h4.6a4.1 4.1 0 0 1 0 8.2h-4.6"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="9" y="25" width="14" height="2.4" rx="1.2" fill="#f2c230" />
    </svg>
  );
}

export function Logo({ className, texto = true }: { className?: string; texto?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMarca />
      {texto && (
        <span className="font-display text-[1.35em] leading-none font-bold tracking-tight">
          Smart<span className="font-semibold opacity-80">Vagas</span>
        </span>
      )}
    </span>
  );
}
