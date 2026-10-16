"use client";

import {
  Banknote,
  CalendarDays,
  Handshake,
  History,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Settings,
  SquareParking,
  Ticket,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  soDono?: boolean;
  contador?: "reservas";
};

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Operação",
    itens: [
      { href: "/patio", rotulo: "Pátio", Icone: SquareParking },
      { href: "/dentro", rotulo: "Quem está dentro", Icone: ListOrdered },
      { href: "/reservas", rotulo: "Reservas", Icone: Ticket, contador: "reservas" },
      { href: "/caixa", rotulo: "Caixa", Icone: Banknote },
      { href: "/historico", rotulo: "Histórico", Icone: History },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/hoje", rotulo: "Painel do dia", Icone: LayoutDashboard },
      { href: "/mensalistas", rotulo: "Mensalistas", Icone: Users },
      { href: "/convenios", rotulo: "Convênios", Icone: Handshake, soDono: true },
      { href: "/agenda", rotulo: "Eventos", Icone: CalendarDays, soDono: true },
      { href: "/financeiro", rotulo: "Financeiro", Icone: TrendingUp, soDono: true },
      { href: "/configuracoes", rotulo: "Configurações", Icone: Settings, soDono: true },
    ],
  },
];

const ROTULO_PAPEL: Record<string, string> = { dono: "Administrador", operador: "Operador" };

function iniciais(nome: string): string {
  return nome
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

type Props = {
  nome: string;
  papel: string;
  estacionamento: string;
  reservasAguardando: number;
};

function Navegacao({
  papel,
  reservasAguardando,
  aoNavegar,
}: {
  papel: string;
  reservasAguardando: number;
  aoNavegar?: () => void;
}) {
  const caminho = usePathname();
  return (
    <nav aria-label="Principal" className="space-y-6">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-400">{grupo.titulo}</p>
          {grupo.itens
            .filter((item) => !item.soDono || papel === "dono")
            .map(({ href, rotulo, Icone, contador }) => {
              const ativo = caminho.startsWith(href);
              const numero = contador === "reservas" ? reservasAguardando : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={aoNavegar}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "relative flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-slate-300 transition hover:bg-white/6 hover:text-white",
                    ativo && "bg-white/10 font-semibold text-white",
                  )}
                >
                  {/* Item ativo marcado como a faixa amarela da pista. */}
                  {ativo && (
                    <span
                      className="bg-faixa absolute inset-y-2 left-0 w-1 rounded-full"
                      aria-hidden
                    />
                  )}
                  <Icone className="size-[18px] shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{rotulo}</span>
                  {numero > 0 && (
                    <span className="bg-faixa text-tinta grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold">
                      {numero}
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}

export function Cabecalho({ nome, papel, estacionamento, reservasAguardando }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);

  async function sair() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const rodape = (
    <div className="flex items-center gap-3 border-t border-white/10 pt-4">
      <span className="bg-faixa text-tinta grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold">
        {iniciais(nome)}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-tight">
        <span className="block truncate font-semibold text-white">
          {nome.replace(/\s*\(.*?\)/, "")}
        </span>
        <span className="text-slate-400">{ROTULO_PAPEL[papel] ?? papel}</span>
      </span>
      <button
        type="button"
        onClick={sair}
        aria-label="Sair"
        title="Sair"
        className="grid size-10 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-5" aria-hidden />
      </button>
    </div>
  );

  const marca = (
    <div className="space-y-3">
      <Link href="/hoje" className="text-white" aria-label="SmartVagas, painel do dia">
        <Logo />
      </Link>
      <p
        className="truncate rounded-lg bg-white/6 px-3 py-2 text-sm text-slate-300"
        title={estacionamento}
      >
        {estacionamento}
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop: menu lateral fixo. */}
      <aside className="textura-asfalto sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto p-4 lg:flex">
        {marca}
        <div className="flex-1">
          <Navegacao papel={papel} reservasAguardando={reservasAguardando} />
        </div>
        {rodape}
      </aside>

      {/* Celular e guichê estreito: barra superior + gaveta. */}
      <header className="textura-asfalto sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 text-white lg:hidden">
        <Link href="/hoje" aria-label="SmartVagas">
          <Logo className="text-[15px]" />
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{estacionamento}</span>
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          className="grid size-11 place-items-center rounded-lg hover:bg-white/10"
        >
          <Menu className="size-6" aria-hidden />
        </button>
      </header>
      {aberto && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            className="bg-tinta/60 absolute inset-0"
            aria-label="Fechar menu"
            onClick={() => setAberto(false)}
          />
          <div className="textura-asfalto absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-2">
              {marca}
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <div className="flex-1">
              <Navegacao
                papel={papel}
                reservasAguardando={reservasAguardando}
                aoNavegar={() => setAberto(false)}
              />
            </div>
            {rodape}
          </div>
        </div>
      )}
    </>
  );
}
