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

function carregarEnv() {
  const resultado = esquema.safeParse(process.env);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas (veja .env.example):\n${problemas}`);
  }
  return resultado.data;
}

export const env = carregarEnv();
