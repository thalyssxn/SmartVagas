"use client";

import { Banknote, CreditCard, QrCode, UserMinus, type LucideIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROTULO_FORMA } from "@/features/estadias/formas-pagamento";
import type { FormaPagamento } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDia } from "@/lib/tempo";
import { baixarMensalidadeAction, encerrarAssinaturaAction } from "../actions";
import type { MensalistaNaLista } from "../listagem";

const FORMAS: { forma: FormaPagamento; Icone: LucideIcon }[] = [
  { forma: "dinheiro", Icone: Banknote },
  { forma: "pix", Icone: QrCode },
  { forma: "cartao", Icone: CreditCard },
];

const STATUS = {
  em_dia: { variant: "success", rotulo: "Em dia" },
  atrasada: { variant: "warning", rotulo: "Atrasada" },
  suspensa: { variant: "danger", rotulo: "Suspensa" },
} as const;

export function LinhaMensalista({ m, podeEncerrar }: { m: MensalistaNaLista; podeEncerrar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const { variant, rotulo } = STATUS[m.status];

  function baixar(formaPagamento: FormaPagamento) {
    const aviso = `Receber ${formatarCentavos(m.valorCentavos)} de ${m.nome} em ${ROTULO_FORMA[formaPagamento].toLowerCase()}?`;
    if (!window.confirm(aviso)) return;
    iniciar(async () => {
      const resultado = await baixarMensalidadeAction({ assinaturaId: m.assinaturaId, formaPagamento });
      if (!resultado.ok) toast.error(resultado.erro.mensagem);
      else toast.success(`${resultado.dados.nome}: pago até ${formatarDia(resultado.dados.venceEm)}.`);
    });
  }

  function encerrar() {
    if (!window.confirm(`Encerrar o plano de ${m.nome}? A vaga fixa fica livre.`)) return;
    iniciar(async () => {
      const resultado = await encerrarAssinaturaAction(m.assinaturaId);
      if (!resultado.ok) toast.error(resultado.erro.mensagem);
      else toast.success("Plano encerrado.");
    });
  }

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            {m.nome}
            {m.contato && <span className="ml-2 text-sm font-normal text-slate-500">{m.contato}</span>}
          </p>
          <p className="text-sm text-slate-600">
            {m.plano} · {formatarCentavos(m.valorCentavos)} · {m.placas.join(", ")}
            {m.vagaFixa && ` · vaga ${m.vagaFixa}`}
          </p>
        </div>
        <Badge variant={variant}>
          {rotulo} · {m.status === "em_dia" ? "vence" : "venceu"} {formatarDia(m.venceEm)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {FORMAS.map(({ forma, Icone }) => (
          <Button
            key={forma}
            variant={m.status === "em_dia" ? "secondary" : "primary"}
            disabled={pendente}
            onClick={() => baixar(forma)}
          >
            <Icone aria-hidden />
            Receber · {ROTULO_FORMA[forma]}
          </Button>
        ))}
        {podeEncerrar && (
          <Button variant="ghost" size="icon" disabled={pendente} onClick={encerrar} aria-label={`Encerrar plano de ${m.nome}`}>
            <UserMinus aria-hidden />
          </Button>
        )}
      </div>
    </li>
  );
}
