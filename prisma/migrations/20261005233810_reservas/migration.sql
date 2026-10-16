-- CreateEnum
CREATE TYPE "StatusReserva" AS ENUM ('pendente', 'confirmada', 'em_uso', 'concluida', 'cancelada', 'expirada');

-- AlterTable
ALTER TABLE "configuracoes" ADD COLUMN     "antecedencia_max_dias" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "antecedencia_min_min" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "bloqueio_avulso_h" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "cancelamento_prazo_h" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "chave_pix" TEXT,
ADD COLUMN     "chegada_antecipada_min" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "duracao_max_h" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "expiracao_pendente_min" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "retencao_pct" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "reservas" (
    "id" UUID NOT NULL,
    "estacionamento_id" UUID NOT NULL,
    "vaga_id" UUID NOT NULL,
    "motorista_id" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "inicio_em" TIMESTAMPTZ(3) NOT NULL,
    "fim_em" TIMESTAMPTZ(3) NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" "StatusReserva" NOT NULL DEFAULT 'pendente',
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paga_em" TIMESTAMPTZ(3),
    "confirmada_por_id" TEXT,
    "cancelada_em" TIMESTAMPTZ(3),
    "reembolso_centavos" INTEGER NOT NULL DEFAULT 0,
    "reembolsada_em" TIMESTAMPTZ(3),
    "estadia_id" UUID,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservas_estadia_id_key" ON "reservas"("estadia_id");

-- CreateIndex
CREATE INDEX "reservas_vaga_id_inicio_em_idx" ON "reservas"("vaga_id", "inicio_em");

-- CreateIndex
CREATE INDEX "reservas_motorista_id_status_idx" ON "reservas"("motorista_id", "status");

-- CreateIndex
CREATE INDEX "reservas_estacionamento_id_status_inicio_em_idx" ON "reservas"("estacionamento_id", "status", "inicio_em");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_estacionamento_id_codigo_key" ON "reservas"("estacionamento_id", "codigo");

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_estacionamento_id_fkey" FOREIGN KEY ("estacionamento_id") REFERENCES "estacionamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_vaga_id_fkey" FOREIGN KEY ("vaga_id") REFERENCES "vagas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_estadia_id_fkey" FOREIGN KEY ("estadia_id") REFERENCES "estadias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Escrito à mão: o Prisma não gera CHECKs.
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_periodo_valido" CHECK ("fim_em" > "inicio_em");
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_valores_nao_negativos" CHECK ("valor_centavos" >= 0 AND "reembolso_centavos" >= 0);
-- No máximo uma reserva pendente por motorista (anti-abuso: pendente trava vaga por até 15 min).
CREATE UNIQUE INDEX "reservas_uma_pendente_por_motorista" ON "reservas" ("motorista_id") WHERE "status" = 'pendente';
