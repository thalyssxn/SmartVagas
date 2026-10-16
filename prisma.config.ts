import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Sem fallback o `prisma generate` do postinstall falharia num clone sem .env;
    // migrate/seed sem DATABASE_URL continuam falhando, com a mensagem do Prisma.
    url: process.env.DATABASE_URL ?? "",
    // Só com `prisma dev`: o Postgres embutido não cria bancos, então o `migrate dev`
    // precisa do shadow database que ele já expõe (porta 51215 por padrão).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
