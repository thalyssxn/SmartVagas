import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/lib/env";
import { prisma } from "./db";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // No Vercel o site também responde no domínio do deploy e no de produção;
  // sem eles aqui, o login de quem abre por esses endereços é recusado (origem não confiável).
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    ...[
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ]
      .filter((dominio): dominio is string => Boolean(dominio))
      .map((dominio) => `https://${dominio}`),
  ],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Cadastro público por aqui é só do motorista: o hook abaixo força o papel.
    // Dono entra por /cadastro/parceiro (action própria); operador é criado pelo dono.
    disableSignUp: false,
  },
  // No banco, para valer entre instâncias serverless (login é alvo de força bruta).
  rateLimit: { storage: "database" },
  user: {
    additionalFields: {
      papel: { type: ["dono", "operador", "motorista"], required: false, input: false },
      estacionamentoId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (usuario) => {
          // V2: o motorista usa qualquer estacionamento; o "de casa" é só o primeiro publicado.
          const casa =
            (await prisma.estacionamento.findFirst({
              where: { publicado: true },
              orderBy: { criadoEm: "asc" },
              select: { id: true },
            })) ??
            // Banco recém-criado sem nenhum estacionamento publicado ainda: usa o primeiro que existir.
            (await prisma.estacionamento.findFirst({
              orderBy: { criadoEm: "asc" },
              select: { id: true },
            }));
          if (!casa) return false;
          return { data: { ...usuario, papel: "motorista", estacionamentoId: casa.id } };
        },
        after: async (usuario) => {
          if (usuario.papel !== "motorista" || !usuario.estacionamentoId) return;
          // Mensalistas cadastrados pelo dono com o mesmo e-mail ganham o login, em qualquer estacionamento.
          // Um por estacionamento: o login só tem um cadastro de cliente em cada lugar.
          const mensalistas = await prisma.motorista.findMany({
            where: { email: usuario.email, userId: null },
            orderBy: { criadoEm: "asc" },
            select: { id: true, estacionamentoId: true },
          });
          const vinculados = new Set<string>();
          for (const m of mensalistas) {
            if (vinculados.has(m.estacionamentoId)) continue;
            vinculados.add(m.estacionamentoId);
            await prisma.motorista.update({ where: { id: m.id }, data: { userId: usuario.id } });
          }
          const casaId = usuario.estacionamentoId as string;
          const naCasa = await prisma.motorista.findFirst({
            where: { estacionamentoId: casaId, userId: usuario.id },
            select: { id: true },
          });
          if (naCasa) return;
          await prisma.motorista.create({
            data: {
              estacionamentoId: casaId,
              nome: usuario.name,
              email: usuario.email,
              userId: usuario.id,
            },
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
