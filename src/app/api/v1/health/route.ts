import { env } from "@/lib/env";
import { COMMIT, VERSAO } from "@/lib/versao";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let db: "ok" | "erro" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "erro";
  }

  return Response.json(
    { version: VERSAO, env: env.NODE_ENV, commit: COMMIT, db },
    { status: db === "ok" ? 200 : 503 },
  );
}
