import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ErroDeNegocio, falha, sucesso, type Resultado } from "@/lib/resultado";

/** Converte exceções de uma action no formato padrão `{ ok, erro: { codigo, mensagem } }`. */
export async function executarAcao<T>(acao: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return sucesso(await acao());
  } catch (erro) {
    // redirect()/notFound() do Next também são exceções e precisam seguir adiante.
    unstable_rethrow(erro);

    if (erro instanceof ErroDeNegocio) return falha(erro.codigo, erro.message);
    if (erro instanceof z.ZodError) {
      return falha("entrada_invalida", erro.issues[0]?.message ?? "Dados inválidos.");
    }
    // Índices únicos (RN-13) pegam a corrida que a checagem prévia não viu.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return falha("conflito", "Outra operação mexeu nesta vaga ou placa agora. Confira e tente de novo.");
    }

    console.error(erro);
    return falha("interno", "Algo deu errado. Tente de novo.");
  }
}
