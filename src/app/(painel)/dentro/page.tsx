import { SquareParking, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AtualizacaoAutomatica } from "@/components/atualizacao-automatica";
import { Placa } from "@/components/placa";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import { listarDentro } from "@/features/estadias/queries";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarDataHora, formatarDuracao } from "@/lib/tempo";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Quem está dentro" };

export default async function PaginaDentro() {
  const contexto = await exigirEquipe();
  const op = await obterOperacao(contexto.estacionamentoId);
  const carros = await listarDentro(contexto.estacionamentoId, op);

  return (
    <div className="space-y-5">
      <AtualizacaoAutomatica />
      <TituloPagina
        titulo={`Quem está dentro (${carros.length})`}
        descricao="Mais antigos primeiro. Valor = quanto pagaria saindo agora."
      />
      <Card>
        {carros.length === 0 ? (
          <Vazio
            Icone={SquareParking}
            titulo="Pátio vazio"
            dica="Quando um carro der entrada, ele aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {carros.map((carro) => (
              <li key={carro.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <Placa valor={carro.placa} tamanho="md" />
                    {carro.modelo && <span className="text-sm text-slate-500">{carro.modelo}</span>}
                  </p>
                  <p className="text-sm text-slate-600">
                    Vaga {carro.vaga} · entrou {formatarDataHora(carro.entradaEm, op.fuso)} ·{" "}
                    {formatarDuracao(carro.minutos)}
                  </p>
                </div>
                {carro.alerta && (
                  <Badge variant="danger">
                    <TriangleAlert aria-hidden />
                    Permanência longa
                  </Badge>
                )}
                {carro.plano && <Badge>Mensalista · {carro.plano}</Badge>}
                <span className="w-20 text-right font-semibold tabular-nums">
                  {formatarCentavos(carro.valorCentavos)}
                </span>
                <Link
                  href={`/patio?estadia=${carro.id}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Dar saída
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
