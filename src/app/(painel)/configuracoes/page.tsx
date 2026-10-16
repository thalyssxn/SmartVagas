import type { Metadata } from "next";
import { TituloPagina } from "@/components/ui/card";
import { FormConfiguracao } from "@/features/configuracao/components/form-configuracao";
import {
  FormEstacionamento,
  GerenciarVagas,
  Operadores,
} from "@/features/configuracao/components/vagas-e-equipe";
import { prisma } from "@/server/db";
import { exigirEquipe } from "@/server/sessao";

export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes({ searchParams }: PageProps<"/configuracoes">) {
  const { estacionamentoId, nome } = await exigirEquipe(["dono"]);
  const novo = (await searchParams).novo === "1";
  const [estacionamento, config, vagas, operadores] = await Promise.all([
    prisma.estacionamento.findUniqueOrThrow({
      where: { id: estacionamentoId },
      select: {
        nome: true,
        endereco: true,
        cidade: true,
        telefone: true,
        horario: true,
        descricao: true,
        latitude: true,
        longitude: true,
        publicado: true,
      },
    }),
    prisma.configuracao.findUniqueOrThrow({ where: { estacionamentoId } }),
    prisma.vaga.findMany({
      where: { estacionamentoId },
      orderBy: { numero: "asc" },
      select: {
        id: true,
        numero: true,
        tipo: true,
        ativa: true,
        reservavel: true,
        motivoBloqueio: true,
        setor: { select: { nome: true } },
      },
    }),
    prisma.user.findMany({
      where: { estacionamentoId, papel: "operador" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      {novo && (
        <div className="textura-asfalto space-y-1 rounded-[var(--radius-superficie)] p-5 text-white">
          <p className="font-display text-2xl font-bold">
            Bem-vindo ao SmartVagas, {nome.split(" ")[0]}!
          </p>
          <p className="text-slate-300">
            Três passos para começar: confira os preços, marque a localização no mapa e libere
            algumas vagas para reserva. Depois ligue &quot;Aparece na busca&quot; para os motoristas
            encontrarem você.
          </p>
        </div>
      )}
      <TituloPagina
        titulo="Configurações"
        descricao="Preços, regras e cadastro. Tudo vale na hora, sem mexer no código."
      />
      <FormEstacionamento {...estacionamento} />
      <FormConfiguracao v={config} />
      <GerenciarVagas vagas={vagas.map((v) => ({ ...v, setor: v.setor?.nome ?? null }))} />
      <Operadores operadores={operadores} />
    </div>
  );
}
