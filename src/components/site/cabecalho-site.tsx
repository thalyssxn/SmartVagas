"use client";

import {
  Bell,
  CalendarDays,
  Car,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type UsuarioSite =
  | { tipo: "visitante" }
  | { tipo: "motorista"; nome: string; avisos: number }
  | { tipo: "equipe"; nome: string };

type Item = { href: string; rotulo: string; Icone: LucideIcon; exato?: boolean };

const PUBLICOS: Item[] = [
  { href: "/explorar", rotulo: "Encontrar vaga", Icone: MapPin },
  { href: "/eventos", rotulo: "Eventos", Icone: CalendarDays },
];

const DO_MOTORISTA: Item[] = [
  { href: "/cliente", rotulo: "Início", Icone: Home, exato: true },
  { href: "/explorar", rotulo: "Buscar", Icone: MapPin },
  { href: "/eventos", rotulo: "Eventos", Icone: CalendarDays },
  { href: "/cliente/reservas", rotulo: "Reservas", Icone: Ticket },
  { href: "/cliente/veiculos", rotulo: "Veículos", Icone: Car },
];

function ativo(caminho: string, item: Item) {
  return item.exato ? caminho === item.href : caminho.startsWith(item.href);
}

export function CabecalhoSite({ usuario }: { usuario: UsuarioSite }) {
  const caminho = usePathname();
  const router = useRouter();
  const motorista = usuario.tipo === "motorista";
  const itens = motorista ? DO_MOTORISTA : PUBLICOS;

  async function sair() {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-900/8 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link
            href={motorista ? "/cliente" : "/"}
            className="text-asfalto"
            aria-label="SmartVagas"
          >
            <Logo />
          </Link>

          <nav
            aria-label="Principal"
            className={cn("ml-4 hidden flex-1 gap-1 md:flex", !motorista && "flex")}
          >
            {itens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo(caminho, item) ? "page" : undefined}
                className={cn(
                  "hover:text-tinta relative flex h-10 items-center gap-1.5 rounded-lg px-3 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-900/5",
                  ativo(caminho, item) && "text-tinta",
                  !motorista && "max-sm:px-2 max-sm:text-sm",
                )}
              >
                <item.Icone
                  className={cn("size-[18px]", !motorista && "max-sm:hidden")}
                  aria-hidden
                />
                {item.rotulo}
                {ativo(caminho, item) && (
                  <span
                    className="bg-faixa absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full"
                    aria-hidden
                  />
                )}
              </Link>
            ))}
          </nav>
          {motorista && <span className="flex-1 md:hidden" />}

          {usuario.tipo === "visitante" && (
            <div className="flex shrink-0 gap-2">
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className={cn(buttonVariants({ variant: "destaque", size: "sm" }), "max-sm:hidden")}
              >
                Criar conta
              </Link>
            </div>
          )}

          {usuario.tipo === "equipe" && (
            <Link
              href="/inicio"
              className={cn(buttonVariants({ variant: "escuro", size: "sm" }), "shrink-0")}
            >
              <LayoutDashboard aria-hidden />
              Ir para o painel
            </Link>
          )}

          {motorista && (
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href="/cliente/avisos"
                aria-label={usuario.avisos > 0 ? `Avisos: ${usuario.avisos} não lidos` : "Avisos"}
                className="hover:text-tinta relative grid size-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-900/5"
              >
                <Bell className="size-5" aria-hidden />
                {usuario.avisos > 0 && (
                  <span className="bg-alerta absolute top-1.5 right-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-white">
                    {usuario.avisos > 9 ? "9+" : usuario.avisos}
                  </span>
                )}
              </Link>
              <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 lg:block">
                {usuario.nome.split(" ")[0]}
              </span>
              <button
                type="button"
                onClick={sair}
                aria-label="Sair"
                title="Sair"
                className="hover:text-tinta grid size-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-900/5"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Celular: barra de abas embaixo, ao alcance do polegar. */}
      {motorista && (
        <nav
          aria-label="Atalhos"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-900/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {DO_MOTORISTA.map((item) => {
            const a = ativo(caminho, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={a ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500",
                  a && "text-tinta",
                )}
              >
                {a && (
                  <span className="bg-faixa absolute top-0 h-[3px] w-8 rounded-full" aria-hidden />
                )}
                <item.Icone className="size-5" aria-hidden />
                {item.rotulo}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
