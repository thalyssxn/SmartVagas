"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { criarAlertaVagaAction } from "@/features/avisos/actions";

/** Estacionamento lotado: o motorista pede para ser avisado na próxima saída. */
export function BotaoAviseMe({
  estacionamentoId,
  logado,
  className,
  variant = "secondary",
}: {
  estacionamentoId: string;
  logado: boolean;
  className?: string;
  variant?: ButtonProps["variant"];
}) {
  const router = useRouter();
  const [feito, setFeito] = useState(false);
  const [pendente, iniciar] = useTransition();

  function pedir() {
    if (!logado) {
      router.push(`/login?voltar=${encodeURIComponent(`/estacionamentos/${estacionamentoId}`)}`);
      return;
    }
    iniciar(async () => {
      const r = await criarAlertaVagaAction(estacionamentoId);
      if (!r.ok) {
        toast.error(r.erro.mensagem);
        return;
      }
      setFeito(true);
      toast.success(`Combinado: avisamos quando abrir vaga em ${r.dados.nome}.`);
    });
  }

  return (
    <Button variant={variant} className={className} disabled={pendente || feito} onClick={pedir}>
      {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <BellRing aria-hidden />}
      {feito ? "Você será avisado" : "Avise-me quando abrir vaga"}
    </Button>
  );
}
