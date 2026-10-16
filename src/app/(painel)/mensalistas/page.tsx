import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardTitle, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { obterOperacao } from "@/features/configuracao/queries";
import { FormMensalista } from "@/features/mensalistas/components/form-mensalista";
import { LinhaMensalista } from "@/features/mensalistas/components/linha-mensalista";
import { Planos } from "@/features/mensalistas/components/planos";
import {
  listarMensalistas,
  listarPlanos,
  listarVagasParaFixar,
} from "@/features/mensalistas/listagem";
import { ehDono, exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Mensalistas" };

export default async function PaginaMensalistas() {
  const contexto = await exigirEquipe();
  const op = await obterOperacao(contexto.estacionamentoId);
  const dono = ehDono(contexto);
  const [mensalistas, planos, vagas] = await Promise.all([
    listarMensalistas(contexto.estacionamentoId, op),
    listarPlanos(contexto.estacionamentoId),
    dono ? listarVagasParaFixar(contexto.estacionamentoId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <TituloPagina
        titulo="Mensalistas"
        descricao="Planos por dia e horário, vaga fixa ou rotativa. O status de cada um é calculado sozinho."
      />
      {dono && <FormMensalista planos={planos.filter((p) => p.ativo)} vagas={vagas} />}

      <Card>
        <CardTitle>Mensalistas ({mensalistas.length})</CardTitle>
        <p className="text-sm text-slate-500">
          Suspensos e atrasados primeiro. A baixa soma um mês ao vencimento e entra no seu caixa.
        </p>
        {mensalistas.length === 0 ? (
          <Vazio
            Icone={Users}
            titulo="Nenhum mensalista ainda"
            dica="Crie um plano e cadastre o primeiro mensalista."
          />
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {mensalistas.map((m) => (
              <LinhaMensalista key={m.assinaturaId} m={m} podeEncerrar={dono} />
            ))}
          </ul>
        )}
      </Card>

      {dono && <Planos planos={planos} />}
    </div>
  );
}
