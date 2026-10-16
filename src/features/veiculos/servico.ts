import { z } from "zod";
import { placaSchema } from "@/lib/placa";
import { ErroDeNegocio } from "@/lib/resultado";
import { TIPOS_VEICULO } from "@/lib/veiculo";
import { prisma } from "@/server/db";
import { clienteNoEstacionamento, type ContextoCliente } from "@/server/sessao";

export const veiculoSchema = z.object({
  placa: placaSchema,
  modelo: z.string().trim().max(40, "Modelo muito longo.").optional(),
  tipo: z.enum(TIPOS_VEICULO).default("carro"),
});

/** V2: os veículos são do login e valem para reservar em qualquer estacionamento. */
export async function listarVeiculosDoCliente(usuarioId: string) {
  const veiculos = await prisma.veiculo.findMany({
    where: { motorista: { userId: usuarioId } },
    orderBy: { placa: "asc" },
    select: { id: true, placa: true, modelo: true, tipo: true },
  });
  // Mensalista em dois estacionamentos pode ter a mesma placa duas vezes.
  const vistas = new Set<string>();
  return veiculos.filter((v) => (vistas.has(v.placa) ? false : (vistas.add(v.placa), true)));
}

export async function adicionarVeiculo(
  cliente: ContextoCliente,
  entrada: z.input<typeof veiculoSchema>,
) {
  const { placa, modelo, tipo } = veiculoSchema.parse(entrada);
  const existente = await prisma.veiculo.findFirst({
    where: { placa, motorista: { userId: cliente.usuarioId } },
    select: { id: true },
  });
  if (existente) throw new ErroDeNegocio("veiculo_duplicado", "Essa placa já está na sua conta.");

  const { motoristaId } = await clienteNoEstacionamento(cliente, cliente.estacionamentoCasaId);
  await prisma.veiculo.create({ data: { motoristaId, placa, modelo: modelo || null, tipo } });
  return { placa };
}

export async function removerVeiculo(cliente: ContextoCliente, veiculoId: string) {
  const veiculo = await prisma.veiculo.findFirst({
    where: { id: veiculoId, motorista: { userId: cliente.usuarioId } },
    select: { placa: true },
  });
  if (!veiculo) throw new ErroDeNegocio("veiculo_inexistente", "Veículo não encontrado.");

  const reservaAtiva = await prisma.reserva.count({
    where: {
      motorista: { userId: cliente.usuarioId },
      placa: veiculo.placa,
      status: { in: ["pendente", "confirmada", "em_uso"] },
    },
  });
  if (reservaAtiva > 0) {
    throw new ErroDeNegocio("veiculo_em_reserva", "Esse veículo tem uma reserva em andamento.");
  }
  await prisma.veiculo.deleteMany({
    where: { placa: veiculo.placa, motorista: { userId: cliente.usuarioId } },
  });
}
