import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { ErroDeNegocio } from "@/lib/resultado";
import { prisma } from "@/server/db";

export const parceiroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(100),
  estacionamento: z.string().trim().min(2, "Informe o nome do estacionamento.").max(80),
  endereco: z.string().trim().min(5, "Informe o endereço.").max(120),
  cidade: z.string().trim().min(2, "Informe a cidade.").max(60),
  vagas: z.coerce
    .number({ message: "Informe quantas vagas." })
    .int("Use um número inteiro.")
    .min(1, "Pelo menos 1 vaga.")
    .max(500, "Até 500 vagas no cadastro; depois dá para criar mais."),
});

// Preço inicial de referência: o dono ajusta em Configurações no primeiro acesso.
const TABELA_INICIAL = {
  toleranciaMin: 15,
  primeiraHoraCentavos: 1000,
  horaAdicionalCentavos: 500,
  diariaCentavos: 4000,
};

/**
 * Usuário administrativo (V2): o dono cadastra o próprio estacionamento.
 * Cria estacionamento, configuração, vagas numeradas e o login de dono numa transação.
 * Começa despublicado: só aparece para motoristas quando o dono revisar preços e localização.
 */
export async function cadastrarParceiro(entrada: z.input<typeof parceiroSchema>) {
  const d = parceiroSchema.parse(entrada);
  const email = d.email.toLowerCase();
  const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existente)
    throw new ErroDeNegocio("email_em_uso", "Esse e-mail já tem cadastro. Entre com ele.");

  const usuarioId = randomUUID();
  const senhaHash = await hashPassword(d.senha);
  const digitos = String(d.vagas).length < 2 ? 2 : String(d.vagas).length;

  await prisma.$transaction(async (tx) => {
    const estacionamento = await tx.estacionamento.create({
      data: {
        nome: d.estacionamento,
        endereco: d.endereco,
        cidade: d.cidade,
        publicado: false,
        configuracao: { create: TABELA_INICIAL },
        setores: { create: { nome: "Geral" } },
      },
      select: { id: true, setores: { select: { id: true } } },
    });
    await tx.vaga.createMany({
      data: Array.from({ length: d.vagas }, (_, i) => ({
        estacionamentoId: estacionamento.id,
        setorId: estacionamento.setores[0].id,
        numero: String(i + 1).padStart(digitos, "0"),
      })),
    });
    await tx.user.create({
      data: {
        id: usuarioId,
        name: d.nome,
        email,
        emailVerified: true,
        papel: "dono",
        estacionamentoId: estacionamento.id,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: usuarioId,
            providerId: "credential",
            password: senhaHash,
          },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        estacionamentoId: estacionamento.id,
        userId: usuarioId,
        acao: "estacionamento.cadastrado",
        entidade: "estacionamento",
        entidadeId: estacionamento.id,
        dados: { vagas: d.vagas, cidade: d.cidade },
      },
    });
  });
  return { email };
}
