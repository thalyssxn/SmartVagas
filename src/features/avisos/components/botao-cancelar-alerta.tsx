"use client";

import { X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelarAlertaVagaAction } from "../actions";

export function BotaoCancelarAlerta({ alertaId }: { alertaId: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await cancelarAlertaVagaAction(alertaId);
          if (!r.ok) toast.error(r.erro.mensagem);
          else toast.success("Pedido de aviso cancelado.");
        })
      }
    >
      <X aria-hidden />
      Cancelar
    </Button>
  );
}
