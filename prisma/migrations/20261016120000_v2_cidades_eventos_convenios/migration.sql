-- V2: busca por cidade e distância, filtro por veículo, eventos, convênios e avisos.

-- AlterEnum
ALTER TYPE "TipoVaga" ADD VALUE 'grande';

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('carro', 'moto', 'grande');

-- CreateEnum
CREATE TYPE "TipoParceiro" AS ENUM ('loja', 'shopping', 'evento', 'empresa', 'outro');

-- CreateEnum
CREATE TYPE "TipoDesconto" AS ENUM ('percentual', 'minutos', 'valor');

-- DropIndex
DROP INDEX "motoristas_user_id_key";

-- AlterTable
ALTER TABLE "estacionamentos" ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telefone" TEXT;

-- AlterTable
ALTER TABLE "estadias" ADD COLUMN     "convenio_id" UUID,
ADD COLUMN     "desconto_centavos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "evento_id" UUID;

-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN     "tipo" "TipoVeiculo" NOT NULL DEFAULT 'carro';

-- CreateTable
CREATE TABLE "eventos" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT NOT NULL,
    "categoria" TEXT,
    "inicio_em" TIMESTAMPTZ(3) NOT NULL,
    "fim_em" TIMESTAMPTZ(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convenios" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoParceiro" NOT NULL,
    "contato" TEXT,
    "telefone" TEXT,
    "tipo_desconto" "TipoDesconto" NOT NULL,
    "valor_desconto" INTEGER NOT NULL,
    "valido_ate" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convenios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_vaga" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificado_em" TIMESTAMPTZ(3),

    CONSTRAINT "alertas_vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida_em" TIMESTAMPTZ(3),
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_estacionamento_id_user_id_key" ON "motoristas"("estacionamento_id", "user_id");

-- CreateIndex
CREATE INDEX "eventos_estacionamento_id_inicio_em_idx" ON "eventos"("estacionamento_id", "inicio_em");

-- CreateIndex
CREATE INDEX "eventos_inicio_em_idx" ON "eventos"("inicio_em");

-- CreateIndex
CREATE UNIQUE INDEX "convenios_estacionamento_id_nome_key" ON "convenios"("estacionamento_id", "nome");

-- CreateIndex
CREATE INDEX "alertas_vaga_estacionamento_id_notificado_em_idx" ON "alertas_vaga"("estacionamento_id", "notificado_em");

-- CreateIndex
CREATE INDEX "alertas_vaga_user_id_idx" ON "alertas_vaga"("user_id");

-- CreateIndex
CREATE INDEX "notificacoes_user_id_lida_em_idx" ON "notificacoes"("user_id", "lida_em");

-- AddForeignKey
ALTER TABLE "estadias" ADD CONSTRAINT "estadias_convenio_id_fkey" FOREIGN KEY ("convenio_id") REFERENCES "convenios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convenios" ADD CONSTRAINT "convenios_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_vaga" ADD CONSTRAINT "alertas_vaga_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_vaga" ADD CONSTRAINT "alertas_vaga_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
