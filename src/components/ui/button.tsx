import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-controle)] font-semibold whitespace-nowrap transition duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primaria text-white shadow-sm shadow-primaria/25 hover:bg-primaria-escura",
        secondary:
          "border border-slate-300 bg-white text-tinta shadow-sm hover:border-slate-400 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-900/5",
        danger: "bg-alerta text-white shadow-sm shadow-alerta/25 hover:bg-red-700",
        // O único botão amarelo de cada tela: a ação que o motorista veio fazer.
        destaque: "bg-faixa text-tinta shadow-sm shadow-faixa-escura/30 hover:bg-[#e4b31f]",
        escuro: "bg-asfalto text-white hover:bg-asfalto-2",
      },
      // Alvo de toque mínimo de 44px (guichê operado com o dedo).
      size: {
        default: "h-11 px-4 text-base",
        sm: "h-9 px-3 text-sm [&_svg]:size-4",
        lg: "h-14 px-6 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
