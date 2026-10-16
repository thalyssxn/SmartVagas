"use client";

import { Loader2, Save } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { paraReais } from "@/lib/dinheiro";
import { atualizarConfiguracaoAction } from "../actions";

type Valores = {
  toleranciaMin: number;
  primeiraHoraCentavos: number;
  horaAdicionalCentavos: number;
  diariaCentavos: number;
  alertaPermanenciaH: number;
  carenciaMensalidadeDias: number;
  antecedenciaMinMin: number;
  antecedenciaMaxDias: number;
  duracaoMaxH: number;
  expiracaoPendenteMin: number;
  cancelamentoPrazoH: number;
  retencaoPct: number;
  bloqueioAvulsoH: number;
  chegadaAntecipadaMin: number;
  chavePix: string | null;
};

export function FormConfiguracao({ v }: { v: Valores }) {
  const [pendente, iniciar] = useTransition();

  function salvar(dados: FormData) {
    iniciar(async () => {
      const c = (n: string) => String(dados.get(n) ?? "");
      const r = await atualizarConfiguracaoAction({
        toleranciaMin: c("toleranciaMin"),
        primeiraHora: c("primeiraHora"),
        horaAdicional: c("horaAdicional"),
        diaria: c("diaria"),
        alertaPermanenciaH: c("alertaPermanenciaH"),
        carenciaMensalidadeDias: c("carenciaMensalidadeDias"),
        antecedenciaMinMin: c("antecedenciaMinMin"),
        antecedenciaMaxDias: c("antecedenciaMaxDias"),
        duracaoMaxH: c("duracaoMaxH"),
        expiracaoPendenteMin: c("expiracaoPendenteMin"),
        cancelamentoPrazoH: c("cancelamentoPrazoH"),
        retencaoPct: c("retencaoPct"),
        bloqueioAvulsoH: c("bloqueioAvulsoH"),
        chegadaAntecipadaMin: c("chegadaAntecipadaMin"),
        chavePix: c("chavePix"),
      });
      if (!r.ok) toast.error(r.erro.mensagem);
      else toast.success("Configurações salvas. Valem a partir de agora.");
    });
  }

  return (
    <form action={salvar} className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>Preços e pátio</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="toleranciaMin" rotulo="Tolerância (min)" type="number" min={0} defaultValue={v.toleranciaMin} dica="Até aqui, a saída não cobra nada." />
          <Campo id="primeiraHora" rotulo="Primeira hora (R$)" inputMode="decimal" defaultValue={paraReais(v.primeiraHoraCentavos)} />
          <Campo id="horaAdicional" rotulo="Hora adicional (R$)" inputMode="decimal" defaultValue={paraReais(v.horaAdicionalCentavos)} />
          <Campo id="diaria" rotulo="Diária (R$)" inputMode="decimal" defaultValue={paraReais(v.diariaCentavos)} dica="Teto de cada bloco de 24 h." />
          <Campo id="alertaPermanenciaH" rotulo="Alerta de permanência (h)" type="number" min={1} defaultValue={v.alertaPermanenciaH} />
          <Campo id="carenciaMensalidadeDias" rotulo="Carência da mensalidade (dias)" type="number" min={0} defaultValue={v.carenciaMensalidadeDias} dica="Depois disso o mensalista perde a vaga fixa." />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Reservas</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="antecedenciaMinMin" rotulo="Antecedência mínima (min)" type="number" min={0} defaultValue={v.antecedenciaMinMin} />
          <Campo id="antecedenciaMaxDias" rotulo="Antecedência máxima (dias)" type="number" min={1} defaultValue={v.antecedenciaMaxDias} />
          <Campo id="duracaoMaxH" rotulo="Duração máxima (h)" type="number" min={1} defaultValue={v.duracaoMaxH} />
          <Campo id="expiracaoPendenteMin" rotulo="Prazo para pagar (min)" type="number" min={5} defaultValue={v.expiracaoPendenteMin} dica="Passou, a reserva expira e libera a vaga." />
          <Campo id="cancelamentoPrazoH" rotulo="Cancelamento grátis até (h antes)" type="number" min={0} defaultValue={v.cancelamentoPrazoH} />
          <Campo id="retencaoPct" rotulo="Retenção fora do prazo (%)" type="number" min={0} max={100} defaultValue={v.retencaoPct} />
          <Campo id="bloqueioAvulsoH" rotulo="Vaga reservada fica segura (h antes)" type="number" min={0} defaultValue={v.bloqueioAvulsoH} dica="Avulso não ocupa vaga com reserva começando nesse prazo." />
          <Campo id="chegadaAntecipadaMin" rotulo="Chegada antecipada (min)" type="number" min={0} defaultValue={v.chegadaAntecipadaMin} />
          <Campo id="chavePix" rotulo="Chave Pix para as reservas" defaultValue={v.chavePix ?? ""} className="sm:col-span-2" dica="Aparece para o motorista na hora de pagar." />
        </div>
      </Card>

      <Button type="submit" size="lg" disabled={pendente}>
        {pendente ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
        Salvar configurações
      </Button>
    </form>
  );
}
