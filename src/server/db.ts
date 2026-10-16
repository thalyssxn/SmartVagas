import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";

function criarCliente() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
}

// Reaproveita a conexão entre recargas do `next dev`.
const globalComPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalComPrisma.prisma ?? criarCliente();

if (env.NODE_ENV !== "production") globalComPrisma.prisma = prisma;

export type Transacao = Prisma.TransactionClient;
