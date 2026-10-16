import { LogIn } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Placa } from "@/components/placa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import type { VagaNoMapa } from "@/features/vagas/queries";
import type { TipoVaga } from "@/generated/prisma/enums";
import { formatarDia } from "@/lib/tempo";
import { darEntradaAction } from "../actions";
import type { ConsultaFora } from "../consulta";

type Props = {
  consulta: ConsultaFora;
  vagas: VagaNoMapa[];
  vagaId: string | null;
  aoEscolherVaga: (vagaId: string) => void;
  aoConcluir: () => void;
};

const ROTULO_TIPO: Record<TipoVaga, string> = {
  comum: "",
  pcd: "PCD",
  idoso: "Idoso",
  moto: "Moto",
  eletrica: "Elétrica",
  grande: "Grande",
};

const AVISO_MENSALISTA = {
  em_dia: { variant: "success", texto: "em dia" },
  atrasada: { variant: "warning", texto: "mensalidade atrasada" },
  suspensa: { variant: "danger", texto: "suspensa: cobra como avulso" },
} as const;

function rotuloVaga(vaga: VagaNoMapa): string {
  const extras = [ROTULO_TIPO[vaga.tipo], vaga.reservavel ? "reservável" : ""].filter(Boolean);
  return extras.length ? `${vaga.numero} (${extras.join(", ")})` : vaga.numero;
}

export function PainelEntrada({ consulta, vagas, vagaId, aoEscolherVaga, aoConcluir }: Props) {
  const [modelo, setModelo] = useState("");
  const [pendente, iniciar] = useTransition();
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const opcoes = vagas.filter((vaga) => vaga.status === "livre" || vaga.id === consulta.vagaFixaId);
  const { mensalista } = consulta;

  // Enter de novo confirma: placa + Enter + Enter (meta de 15 s).
  useEffect(() => confirmarRef.current?.focus(), []);

  function confirmar() {
    if (!vagaId) return;
    iniciar(async () => {
      const resultado = await darEntradaAction({ placa: consulta.placa, vagaId, modelo });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      toast.success(`Entrada ${resultado.dados.placa} → vaga ${resultado.dados.vaga}`);
      if (resultado.dados.alerta) toast.warning(resultado.dados.alerta);
      aoConcluir();
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="font-display text-livre text-xl font-bold">Entrada</p>
        <Placa valor={consulta.placa} tamanho="md" className="mt-1" />
      </div>

      {consulta.reserva && (
        <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-900 ring-1 ring-green-200">
          Reserva paga {consulta.reserva.codigo}: vaga {consulta.reserva.vaga}
        </p>
      )}

      {mensalista && (
        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold">
            Mensalista: {mensalista.nome} · {mensalista.plano}
          </p>
          <Badge variant={AVISO_MENSALISTA[mensalista.status].variant}>
            {AVISO_MENSALISTA[mensalista.status].texto} ·{" "}
            {mensalista.status === "em_dia" ? "vence" : "venceu"} {formatarDia(mensalista.venceEm)}
          </Badge>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="vaga">Vaga</Label>
        <Select
          id="vaga"
          value={vagaId ?? ""}
          onChange={(evento) => aoEscolherVaga(evento.target.value)}
        >
          <option value="" disabled>
            {opcoes.length ? "Escolha a vaga" : "Pátio lotado"}
          </option>
          {opcoes.map((vaga) => (
            <option key={vaga.id} value={vaga.id}>
              {rotuloVaga(vaga)}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-500">Ou toque numa vaga livre no mapa.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="modelo">Modelo (opcional)</Label>
        <Input
          id="modelo"
          value={modelo}
          maxLength={40}
          onChange={(evento) => setModelo(evento.target.value)}
          placeholder="Ex.: Onix prata"
        />
      </div>

      <Button
        ref={confirmarRef}
        size="lg"
        className="w-full"
        disabled={!vagaId || pendente}
        onClick={confirmar}
      >
        <LogIn aria-hidden />
        Dar entrada
      </Button>
    </Card>
  );
}
