-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('dono', 'operador', 'motorista');

-- CreateEnum
CREATE TYPE "TipoVaga" AS ENUM ('comum', 'pcd', 'idoso', 'moto', 'eletrica');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('dinheiro', 'pix', 'cartao');

-- CreateEnum
CREATE TYPE "CategoriaCusto" AS ENUM ('folha', 'aluguel', 'energia', 'agua', 'manutencao', 'outros');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'operador',
    "estacionamento_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estacionamentos" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "horario" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estacionamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "estacionamento_id" UUID NOT NULL,
    "tolerancia_min" INTEGER NOT NULL DEFAULT 15,
    "primeira_hora_centavos" INTEGER NOT NULL,
    "hora_adicional_centavos" INTEGER NOT NULL,
    "diaria_centavos" INTEGER NOT NULL,
    "alerta_permanencia_h" INTEGER NOT NULL DEFAULT 12,
    "carencia_mensalidade_dias" INTEGER NOT NULL DEFAULT 5,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("estacionamento_id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vagas" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "setor_id" UUID,
    "numero" TEXT NOT NULL,
    "tipo" "TipoVaga" NOT NULL DEFAULT 'comum',
    "coberta" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "motivo_bloqueio" TEXT,
    "reservavel" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estadias" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "vaga_id" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT,
    "entrada_em" TIMESTAMPTZ(3) NOT NULL,
    "saida_em" TIMESTAMPTZ(3),
    "valor_centavos" INTEGER,
    "forma_pagamento" "FormaPagamento",
    "assinatura_id" UUID,
    "turno_id" UUID,
    "retroativa" BOOLEAN NOT NULL DEFAULT false,
    "entrada_por_id" TEXT NOT NULL,
    "saida_por_id" TEXT,

    CONSTRAINT "estadias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "dias_semana" INTEGER[],
    "inicio_min" INTEGER,
    "fim_min" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "user_id" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" UUID NOT NULL,
    "motorista_id" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" UUID NOT NULL,
    "motorista_id" UUID NOT NULL,
    "plano_id" UUID NOT NULL,
    "vaga_fixa_id" UUID,
    "vence_em" DATE NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrada_em" TIMESTAMPTZ(3),

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_mensalidade" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "assinatura_id" UUID NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "forma_pagamento" "FormaPagamento" NOT NULL,
    "pago_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodo_ate" DATE NOT NULL,
    "turno_id" UUID,
    "registrado_por_id" TEXT NOT NULL,

    CONSTRAINT "pagamentos_mensalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "salario_centavos" INTEGER NOT NULL,
    "encargos_centavos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT,

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custos" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "categoria" "CategoriaCusto" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "funcionario_id" UUID,
    "competencia" TEXT,
    "criado_por_id" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "operador_id" TEXT NOT NULL,
    "aberto_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "troco_inicial_centavos" INTEGER NOT NULL,
    "fechado_em" TIMESTAMPTZ(3),
    "contado_centavos" INTEGER,
    "esperado_centavos" INTEGER,
    "observacao" TEXT,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT,
    "dados" JSONB,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");

-- CreateIndex
CREATE UNIQUE INDEX "setores_estacionamento_id_nome_key" ON "setores"("estacionamento_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "vagas_estacionamento_id_numero_key" ON "vagas"("estacionamento_id", "numero");

-- CreateIndex
CREATE INDEX "estadias_estacionamento_id_saida_em_idx" ON "estadias"("estacionamento_id", "saida_em");

-- CreateIndex
CREATE INDEX "estadias_estacionamento_id_placa_idx" ON "estadias"("estacionamento_id", "placa");

-- CreateIndex
CREATE UNIQUE INDEX "planos_estacionamento_id_nome_key" ON "planos"("estacionamento_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_user_id_key" ON "motoristas"("user_id");

-- CreateIndex
CREATE INDEX "veiculos_placa_idx" ON "veiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_motorista_id_placa_key" ON "veiculos"("motorista_id", "placa");

-- CreateIndex
CREATE INDEX "assinaturas_motorista_id_idx" ON "assinaturas"("motorista_id");

-- CreateIndex
CREATE INDEX "pagamentos_mensalidade_estacionamento_id_pago_em_idx" ON "pagamentos_mensalidade"("estacionamento_id", "pago_em");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_user_id_key" ON "funcionarios"("user_id");

-- CreateIndex
CREATE INDEX "custos_estacionamento_id_data_idx" ON "custos"("estacionamento_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "custos_funcionario_id_competencia_key" ON "custos"("funcionario_id", "competencia");

-- CreateIndex
CREATE INDEX "audit_logs_estacionamento_id_criado_em_idx" ON "audit_logs"("estacionamento_id", "criado_em");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setores" ADD CONSTRAINT "setores_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "setores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_vaga_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vagas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_entrada_por_id_fkey" FOREIGN KEY ("entrada_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_saida_por_id_fkey" FOREIGN KEY ("saida_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos" ADD CONSTRAINT "planos_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_vaga_fixa_id_fkey" FOREIGN KEY ("vaga_fixa_id") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_mensalidade_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_mensalidade_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_mensalidade_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_mensalidade_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custos" ADD CONSTRAINT "custos_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custos" ADD CONSTRAINT "custos_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custos" ADD CONSTRAINT "custos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Escrito à mão: o Prisma não gera índices parciais nem CHECKs.
-- Se uma migration futura tentar dropar estes índices, remova esse trecho dela.
-- ---------------------------------------------------------------------------

-- RN-13: no máximo uma estadia aberta por vaga e por placa (trava a corrida de dois operadores).
CREATE UNIQUE INDEX "estadias_uma_aberta_por_vaga" ON "estadias" ("vaga_id") WHERE "saida_em" IS NULL;
CREATE UNIQUE INDEX "estadias_uma_aberta_por_placa" ON "estadias" ("estacionamento_id", "placa") WHERE "saida_em" IS NULL;

-- RN-04: uma vaga fixa pertence a um mensalista por vez.
CREATE UNIQUE INDEX "assinaturas_vaga_fixa_unica" ON "assinaturas" ("vaga_fixa_id") WHERE "encerrada_em" IS NULL AND "vaga_fixa_id" IS NOT NULL;

-- RF-07d: um caixa aberto por operador.
CREATE UNIQUE INDEX "turnos_um_aberto_por_operador" ON "turnos" ("operador_id") WHERE "fechado_em" IS NULL;

-- Dinheiro nunca negativo; saída nunca antes da entrada.
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_valor_nao_negativo" CHECK ("valor_centavos" >= 0);
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_saida_depois_da_entrada" CHECK ("saida_em" IS NULL OR "saida_em" >= "entrada_em");
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_valores_nao_negativos" CHECK (
  "tolerancia_min" >= 0 AND "primeira_hora_centavos" >= 0 AND "hora_adicional_centavos" >= 0 AND "diaria_centavos" >= 0
);
ALTER TABLE "planos" ADD CONSTRAINT "planos_valor_nao_negativo" CHECK ("valor_centavos" >= 0);
ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_valor_positivo" CHECK ("valor_centavos" > 0);
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_valores_nao_negativos" CHECK ("salario_centavos" >= 0 AND "encargos_centavos" >= 0);
ALTER TABLE "custos" ADD CONSTRAINT "custos_valor_positivo" CHECK ("valor_centavos" > 0);
