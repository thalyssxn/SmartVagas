import { cn } from "@/lib/utils";

const CAMPO =
  "h-11 w-full rounded-[var(--radius-controle)] border border-slate-300 bg-white px-3 text-base text-tinta transition placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-primaria focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-primaria/20 disabled:opacity-50";

// text-base evita o zoom automático do iOS ao focar.
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(CAMPO, className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(CAMPO, "pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(CAMPO, "h-auto min-h-20 py-2", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-semibold text-slate-700", className)} {...props} />;
}
