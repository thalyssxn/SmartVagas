import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizarPlaca } from "@/lib/placa";

type Props = {
  ref: React.Ref<HTMLInputElement>;
  valor: string;
  pendente: boolean;
  aoMudar: (placa: string) => void;
  aoEnviar: () => void;
};

const TAMANHO_PLACA = 7;

/** O campo é desenhado como uma placa Mercosul: é a ação principal da tela. */
export function CampoPlaca({ ref, valor, pendente, aoMudar, aoEnviar }: Props) {
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        aoEnviar();
      }}
      className="flex gap-2"
    >
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border-2 border-slate-800 bg-white shadow-elevado transition focus-within:ring-4 focus-within:ring-primaria/25">
        <div className="flex items-center justify-center bg-placa py-0.5 text-[10px] font-bold tracking-[0.45em] text-white">
          BRASIL
        </div>
        <input
          ref={ref}
          value={valor}
          onChange={(evento) => aoMudar(normalizarPlaca(evento.target.value).slice(0, TAMANHO_PLACA))}
          placeholder="ABC1D23"
          aria-label="Placa do veículo"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          className="h-14 w-full bg-transparent text-center font-mono text-3xl font-bold tracking-[0.2em] text-slate-900 uppercase outline-none placeholder:font-normal placeholder:text-slate-300"
        />
      </div>
      <Button type="submit" size="lg" className="h-auto" disabled={pendente || valor.length < TAMANHO_PLACA}>
        {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
        <span className="sr-only sm:not-sr-only">Buscar</span>
      </Button>
    </form>
  );
}
