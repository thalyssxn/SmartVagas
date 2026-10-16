import { Car } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, TituloPagina } from "@/components/ui/card";
import { Vazio } from "@/components/vazio";
import { FormVeiculo, ItemVeiculo } from "@/features/veiculos/components/veiculos";
import { listarVeiculosDoCliente } from "@/features/veiculos/servico";
import { exigirCliente } from "@/server/sessao";

export const metadata: Metadata = { title: "Meus veículos" };

export default async function PaginaVeiculos({ searchParams }: PageProps<"/cliente/veiculos">) {
  const cliente = await exigirCliente();
  const veiculos = await listarVeiculosDoCliente(cliente.usuarioId);
  const boasVindas = (await searchParams)["boas-vindas"] === "1";

  return (
    <div className="space-y-5">
      {boasVindas && (
        <p className="bg-primaria-clara text-primaria-escura rounded-xl p-4">
          <strong>Conta criada, {cliente.nome.split(" ")[0]}!</strong> Cadastre seu veículo: a busca
          mostra só as vagas em que ele cabe, e o guichê reconhece sua reserva pela placa.
        </p>
      )}
      <TituloPagina
        titulo="Meus veículos"
        descricao="Valem para reservar em qualquer estacionamento SmartVagas."
      />
      <FormVeiculo />
      <Card>
        {veiculos.length === 0 ? (
          <Vazio
            Icone={Car}
            titulo="Nenhum veículo cadastrado"
            dica="Adicione a placa do seu carro, moto ou caminhonete para poder reservar."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {veiculos.map((v) => (
              <ItemVeiculo key={v.id} {...v} />
            ))}
          </ul>
        )}
      </Card>
      {veiculos.length > 0 && (
        <Link href="/explorar" className="text-primaria inline-block font-semibold hover:underline">
          Procurar vaga agora
        </Link>
      )}
      <p className="text-xs text-slate-500">
        A placa é usada só para identificar seu veículo na entrada e na saída.
      </p>
    </div>
  );
}
