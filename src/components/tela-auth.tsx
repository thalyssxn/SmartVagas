import Link from "next/link";
import { CenaPatio } from "@/components/cena-patio";
import { Logo } from "@/components/logo";

/** Moldura de login e cadastro: asfalto com o pátio ao lado do formulário (empilhado no celular). */
export function TelaAuth({
  titulo,
  subtitulo,
  frase = "Sua vaga garantida antes de sair de casa.",
  children,
}: {
  titulo: string;
  subtitulo?: string;
  frase?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[1.1fr_1fr]">
      <aside className="textura-asfalto relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <Link href="/" className="relative w-fit" aria-label="SmartVagas, página inicial">
          <Logo className="text-xl" />
        </Link>
        <div className="relative space-y-8">
          <h2 className="font-display max-w-lg text-5xl leading-[1.02] font-bold tracking-tight">
            {frase}
          </h2>
          <CenaPatio className="max-w-xl" />
        </div>
        <div
          className="faixa-tracejada relative h-1.5 w-full rounded-full opacity-80"
          aria-hidden
        />
      </aside>

      <main className="flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <Link
              href="/"
              className="text-asfalto inline-block lg:hidden"
              aria-label="SmartVagas, página inicial"
            >
              <Logo className="text-xl" />
            </Link>
            <h1 className="font-display pt-2 text-4xl leading-none font-bold tracking-tight lg:pt-0">
              {titulo}
            </h1>
            {subtitulo && <p className="text-slate-600">{subtitulo}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
