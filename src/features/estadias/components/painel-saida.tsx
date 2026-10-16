import { Banknote, CreditCard, Handshake, LogOut, QrCode, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Placa } from "@/components/placa";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { aplicarConvenio, descreverDesconto } from "@/features/convenios/regras";
import type { ConvenioNoGuiche } from "@/features/convenios/servico";
import type { FormaPagamento } from "@/generated/prisma/enums";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDuracao, formatarHora } from "@/lib/tempo";
import { darSaidaAction } from "../actions";
import type { ConsultaDentro } from "../consulta";
import { ROTULO_FORMA } from "../formas-pagamento";
import type { TabelaPreco } from "../preco";

type Props = {
  consulta: ConsultaDentro;
  fuso: string;
  convenios: ConvenioNoGuiche[];
  tabela: TabelaPreco;
  aoConcluir: () => void;
};

const FORMAS: { forma: FormaPagamento; Icone: LucideIcon }[] = [
  { forma: "dinheiro", Icone: Banknote },
  { forma: "pix", Icone: QrCode },
  { forma: "cartao", Icone: CreditCard },
];

export function PainelSaida({ consulta, fuso, convenios, tabela, aoConcluir }: Props) {
  const { estadia, cobranca } = consulta;
  const [convenioId, setConvenioId] = useState("");
  const [pendente, iniciar] = useTransition();
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const convenio = convenios.find((c) => c.id === convenioId) ?? null;
  // Prévia; o servidor recalcula tudo na hora de gravar.
  const { descontoCentavos, valorFinalCentavos } = convenio
    ? aplicarConvenio(cobranca.valorCentavos, cobranca.minutosCobrados, convenio, tabela)
    : { descontoCentavos: 0, valorFinalCentavos: cobranca.valorCentavos };
  const gratis = valorFinalCentavos === 0;

  // Sem cobrança, Enter confirma. Com cobrança o operador escolhe a forma: sem padrão,
  // para o caixa não fechar errado por um Enter distraído.
  useEffect(() => confirmarRef.current?.focus(), []);

  function confirmar(formaPagamento?: FormaPagamento) {
    iniciar(async () => {
      const resultado = await darSaidaAction({
        estadiaId: estadia.id,
        formaPagamento,
        convenioId: convenioId || undefined,
      });
      if (!resultado.ok) {
        toast.error(resultado.erro.mensagem);
        return;
      }
      const {
        placa,
        valorCentavos,
        formaPagamento: forma,
        convenio: nomeConvenio,
        avisados,
      } = resultado.dados;
      const valor = forma
        ? `${formatarCentavos(valorCentavos)} (${ROTULO_FORMA[forma]})`
        : "sem cobrança";
      toast.success(
        `Saída ${placa} · ${valor}${nomeConvenio ? ` · convênio ${nomeConvenio}` : ""}`,
      );
      if (avisados > 0) toast.info(`${avisados} motorista(s) que esperavam vaga foram avisados.`);
      aoConcluir();
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="font-display text-alerta text-xl font-bold">Saída</p>
        <Placa valor={estadia.placa} tamanho="md" className="mt-1" />
        {estadia.modelo && <p className="text-sm text-slate-600">{estadia.modelo}</p>}
      </div>

      <dl className="bg-concreto grid grid-cols-3 gap-2 rounded-xl p-3 text-sm">
        <div>
          <dt className="text-slate-500">Vaga</dt>
          <dd className="font-semibold">{estadia.vaga}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Entrada</dt>
          <dd className="font-semibold">{formatarHora(new Date(estadia.entradaEm), fuso)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Tempo</dt>
          <dd className="font-semibold">{formatarDuracao(cobranca.minutosTotais)}</dd>
        </div>
      </dl>

      {cobranca.plano && (
        <p className="rounded-lg bg-slate-50 p-2 text-sm">
          Mensalista · {cobranca.plano}
          {cobranca.minutosCobrados > 0 &&
            ` · ${formatarDuracao(cobranca.minutosCobrados)} fora do plano`}
        </p>
      )}

      {cobranca.reserva && (
        <p className="rounded-lg bg-slate-50 p-2 text-sm">
          Reserva paga {cobranca.reserva}
          {cobranca.minutosCobrados > 0
            ? ` · ${formatarDuracao(cobranca.minutosCobrados)} além do horário reservado (taxa adicional)`
            : " · dentro do horário reservado"}
        </p>
      )}

      {convenios.length > 0 && cobranca.valorCentavos > 0 && (
        <div className="space-y-1">
          <Label htmlFor="convenio" className="flex items-center gap-1.5">
            <Handshake className="size-4" aria-hidden />
            Convênio (cliente trouxe o ticket validado?)
          </Label>
          <Select id="convenio" value={convenioId} onChange={(e) => setConvenioId(e.target.value)}>
            <option value="">Sem convênio</option>
            {convenios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {descreverDesconto(c)}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="text-center">
        {descontoCentavos > 0 && (
          <p className="text-sm text-slate-500">
            <span className="line-through">{formatarCentavos(cobranca.valorCentavos)}</span> −{" "}
            {formatarCentavos(descontoCentavos)} pagos por {convenio?.nome}
          </p>
        )}
        <p className="font-display text-6xl leading-none font-bold tabular-nums">
          {formatarCentavos(valorFinalCentavos)}
        </p>
      </div>

      {gratis ? (
        <Button
          ref={confirmarRef}
          size="lg"
          className="w-full"
          disabled={pendente}
          onClick={() => confirmar()}
        >
          <LogOut aria-hidden />
          Confirmar saída
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {FORMAS.map(({ forma, Icone }) => (
            <Button
              key={forma}
              size="lg"
              className="h-16 flex-col gap-0.5 px-2 text-base"
              disabled={pendente}
              onClick={() => confirmar(forma)}
            >
              <Icone aria-hidden />
              {ROTULO_FORMA[forma]}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
