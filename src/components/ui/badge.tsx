import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        neutral: "bg-slate-100 text-slate-700",
        success: "bg-green-100 text-green-800",
        warning: "bg-amber-100 text-amber-900",
        danger: "bg-alerta text-white",
        info: "bg-primaria-clara text-primaria-escura",
        faixa: "bg-faixa text-tinta",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
