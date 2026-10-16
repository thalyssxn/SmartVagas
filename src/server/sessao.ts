import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Papel } from "@/generated/prisma/enums";
import { ErroDeNegocio } from "@/lib/resultado";
import { auth } from "./auth";
import { prisma } from "./db";

export type Contexto = {
  usuarioId: string;
  nome: string;
  papel: Papel;
  estacionamentoId: string;
};

const PAPEIS_EQUIPE: Papel[] = ["dono", "operador"];

export const obterSessao = cache(async () => auth.api.getSession({ headers: await headers() }));

function ehPapel(valor: unknown): valor is Papel {
  return valor === "dono" || valor === "operador" || valor === "motorista";
}

/**
 * RBAC no servidor (docs/MVP_v1.1.md §8). Toda página e action do painel passa por aqui;
 * o front esconder um botão não é controle de acesso.
 */
export async function exigirEquipe(papeis: Papel[] = PAPEIS_EQUIPE): Promise<Contexto> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login?perfil=equipe");

  const { id, name, papel, estacionamentoId } = sessao.user;
  if (papel === "motorista") redirect("/cliente");
  if (!ehPapel(papel) || !PAPEIS_EQUIPE.includes(papel) || !estacionamentoId) {
    redirect("/login?erro=sem-acesso");
  }
  if (!papeis.includes(papel)) redirect("/patio");

  return { usuarioId: id, nome: name, papel, estacionamentoId };
}

export function ehDono(contexto: Contexto): boolean {
  return contexto.papel === "dono";
}

/** Contexto do motorista dentro de UM estacionamento (o cadastro de cliente daquele lugar). */
export type ContextoMotorista = Contexto & { motoristaId: string; email: string };

/** Login de motorista (V2): pode ser cliente de vários estacionamentos. */
export type ContextoCliente = {
  usuarioId: string;
  nome: string;
  email: string;
  estacionamentoCasaId: string;
};

export async function obterCliente(): Promise<ContextoCliente | null> {
  const sessao = await obterSessao();
  if (!sessao || sessao.user.papel !== "motorista" || !sessao.user.estacionamentoId) return null;
  return {
    usuarioId: sessao.user.id,
    nome: sessao.user.name,
    email: sessao.user.email,
    estacionamentoCasaId: sessao.user.estacionamentoId,
  };
}

/** Portal do cliente: só quem tem papel motorista entra. */
export async function exigirCliente(voltarPara?: string): Promise<ContextoCliente> {
  const sessao = await obterSessao();
  if (!sessao) redirect(voltarPara ? `/login?voltar=${encodeURIComponent(voltarPara)}` : "/login");
  const cliente = await obterCliente();
  if (!cliente) redirect("/patio");
  return cliente;
}

/**
 * Cadastro do cliente num estacionamento: cria na primeira reserva ali.
 * Reaproveita o mensalista que o dono cadastrou com o mesmo e-mail.
 */
export async function clienteNoEstacionamento(
  cliente: ContextoCliente,
  estacionamentoId: string,
): Promise<ContextoMotorista> {
  const estacionamento = await prisma.estacionamento.findUnique({
    where: { id: estacionamentoId },
    select: { id: true },
  });
  if (!estacionamento)
    throw new ErroDeNegocio("estacionamento_inexistente", "Estacionamento não encontrado.");

  let motorista = await prisma.motorista.findFirst({
    where: { estacionamentoId, userId: cliente.usuarioId },
    select: { id: true },
  });
  if (!motorista) {
    const mensalista = await prisma.motorista.findFirst({
      where: { estacionamentoId, email: cliente.email, userId: null },
      select: { id: true },
    });
    motorista = mensalista
      ? await prisma.motorista.update({
          where: { id: mensalista.id },
          data: { userId: cliente.usuarioId },
          select: { id: true },
        })
      : await prisma.motorista.create({
          data: {
            estacionamentoId,
            nome: cliente.nome,
            email: cliente.email,
            userId: cliente.usuarioId,
          },
          select: { id: true },
        });
  }

  return {
    usuarioId: cliente.usuarioId,
    nome: cliente.nome,
    email: cliente.email,
    papel: "motorista",
    estacionamentoId,
    motoristaId: motorista.id,
  };
}

/** Compatibilidade: o portal antigo usava o estacionamento "de casa" do motorista. */
export async function exigirMotorista(): Promise<ContextoMotorista> {
  const cliente = await exigirCliente();
  return clienteNoEstacionamento(cliente, cliente.estacionamentoCasaId);
}
