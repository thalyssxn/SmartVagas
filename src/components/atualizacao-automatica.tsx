"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVALO_MS = 15_000;

/**
 * "Tempo real" do MVP: re-renderiza a página a cada 15 s para refletir o que outros
 * operadores fizeram. Polling basta para um pátio; websocket fica para quando doer.
 */
export function AtualizacaoAutomatica() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
