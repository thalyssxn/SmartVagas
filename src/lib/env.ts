import { z } from "zod";

function fusoValido(fuso: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

// Só infraestrutura e segredos. Regras de negócio (preço, tolerância…) ficam no banco.
const esquema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "use pelo menos 32 caracteres"),
  BETTER_AUTH_URL: z.url(),
  APP_TIMEZONE: z.string().refine(fusoValido, "fuso horário IANA inválido").default("America/Sao_Paulo"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Só para o `next build` coletar as páginas quando o deploy ainda não tem as variáveis.
// Nenhuma página consulta o banco no build (todas são dinâmicas); em execução elas continuam obrigatórias.
const SUBSTITUTOS_DE_BUILD: Record<string, string> = {
  DATABASE_URL: "postgresql://build:build@localhost:5432/build",
  BETTER_AUTH_SECRET: "build-somente-sem-uso-em-execucao-0000",
  BETTER_AUTH_URL: "http://localhost:3000",
};

function carregarEnv() {
  const emBuild = process.env.NEXT_PHASE === "phase-production-build";
  const origem = emBuild
    ? {
        ...process.env,
        ...Object.fromEntries(
          Object.entries(SUBSTITUTOS_DE_BUILD).filter(([nome]) => !process.env[nome]),
        ),
      }
    : process.env;
  const resultado = esquema.safeParse(origem);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas (veja .env.example):\n${problemas}`);
  }
  return resultado.data;
}

export const env = carregarEnv();
