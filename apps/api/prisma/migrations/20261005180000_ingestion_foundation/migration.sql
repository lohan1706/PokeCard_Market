-- CreateEnum
CREATE TYPE "IngestionJobType" AS ENUM ('SETS', 'CARDS', 'PRICES');

-- CreateEnum
CREATE TYPE "ExternalEntityType" AS ENUM ('SET', 'CARD');

-- CreateEnum
CREATE TYPE "ImportRecordType" AS ENUM ('SET', 'CARD', 'PRICE');

-- CreateEnum
CREATE TYPE "ImportRecordStatus" AS ENUM ('IMPORTED', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "IngestionRun" ADD COLUMN "errorsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "jobType" "IngestionJobType" NOT NULL DEFAULT 'SETS',
ADD COLUMN "setsSeen" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "skipped" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Price" ADD COLUMN "conditionCode" VARCHAR(32) NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN "externalId" VARCHAR(128),
ADD COLUMN "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "PriceHistory" ADD COLUMN "conditionCode" VARCHAR(32) NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN "externalId" VARCHAR(128),
ADD COLUMN "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Set" ADD COLUMN "cardCount" INTEGER,
ADD COLUMN "region" VARCHAR(16);

-- DropIndex
DROP INDEX "Price_cardVariantId_providerId_currency_key";

-- DropIndex
DROP INDEX "PriceHistory_cardVariantId_providerId_currency_capturedOn_key";

-- CreateTable
CREATE TABLE "SetTranslation" (
    "id" UUID NOT NULL,
    "setId" UUID NOT NULL,
    "language" VARCHAR(16) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "series" VARCHAR(120),
    "logoUrl" TEXT,
    "symbolUrl" TEXT,
    "sourceExternalId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SetTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTranslation" (
    "id" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "language" VARCHAR(16) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "localisedData" JSONB NOT NULL,
    "imageUrl" TEXT,
    "imageLargeUrl" TEXT,
    "thumbnailUrl" TEXT,
    "sourceExternalId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CardTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPrinting" (
    "cardId" UUID NOT NULL,
    "illustrator" VARCHAR(120),
    "weakness" VARCHAR(80),
    "resistance" VARCHAR(80),
    "retreatCost" INTEGER,
    "level" VARCHAR(16),
    "regulationMark" VARCHAR(8),
    "evolveFrom" VARCHAR(120),
    "types" TEXT[],
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CardPrinting_pkey" PRIMARY KEY ("cardId")
);

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "entityType" "ExternalEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "externalId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "type" "ImportRecordType" NOT NULL,
    "externalId" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ImportRecordStatus" NOT NULL,
    "error" VARCHAR(500),
    "importedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionError" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "externalId" VARCHAR(128),
    "message" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportConflict" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "reason" VARCHAR(80) NOT NULL,
    "externalId" VARCHAR(128),
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionMap" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "externalValue" VARCHAR(80) NOT NULL,
    "internalCode" VARCHAR(32) NOT NULL,

    CONSTRAINT "ConditionMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SetTranslation_language_idx" ON "SetTranslation"("language");

-- CreateIndex
CREATE UNIQUE INDEX "SetTranslation_setId_language_key" ON "SetTranslation"("setId", "language");

-- CreateIndex
CREATE INDEX "CardTranslation_language_idx" ON "CardTranslation"("language");

-- CreateIndex
CREATE UNIQUE INDEX "CardTranslation_cardId_language_key" ON "CardTranslation"("cardId", "language");

-- CreateIndex
CREATE INDEX "ExternalIdentity_entityType_entityId_idx" ON "ExternalIdentity"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_providerId_entityType_externalId_key" ON "ExternalIdentity"("providerId", "entityType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRecord_providerId_type_externalId_key" ON "ImportRecord"("providerId", "type", "externalId");

-- CreateIndex
CREATE INDEX "IngestionError_runId_idx" ON "IngestionError"("runId");

-- CreateIndex
CREATE INDEX "ImportConflict_runId_idx" ON "ImportConflict"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionMap_providerId_externalValue_key" ON "ConditionMap"("providerId", "externalValue");

-- CreateIndex
CREATE UNIQUE INDEX "Price_variant_provider_ccy_cond_key" ON "Price"("cardVariantId", "providerId", "currency", "conditionCode");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_variant_provider_ccy_cond_day_key" ON "PriceHistory"("cardVariantId", "providerId", "currency", "conditionCode", "capturedOn");

-- AddForeignKey
ALTER TABLE "SetTranslation" ADD CONSTRAINT "SetTranslation_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTranslation" ADD CONSTRAINT "CardTranslation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPrinting" ADD CONSTRAINT "CardPrinting_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionError" ADD CONSTRAINT "IngestionError_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportConflict" ADD CONSTRAINT "ImportConflict_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionMap" ADD CONSTRAINT "ConditionMap_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Price" ADD CONSTRAINT "Price_conditionCode_check" CHECK ("conditionCode" IN ('UNSPECIFIED', 'NM', 'LP', 'MP', 'HP', 'DM'));
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_conditionCode_check" CHECK ("conditionCode" IN ('UNSPECIFIED', 'NM', 'LP', 'MP', 'HP', 'DM'));
ALTER TABLE "ConditionMap" ADD CONSTRAINT "ConditionMap_internalCode_check" CHECK ("internalCode" IN ('UNSPECIFIED', 'NM', 'LP', 'MP', 'HP', 'DM'));
ALTER TABLE "Set" ADD CONSTRAINT "Set_cardCount_check" CHECK ("cardCount" IS NULL OR "cardCount" >= 0);
ALTER TABLE "CardPrinting" ADD CONSTRAINT "CardPrinting_retreatCost_check" CHECK ("retreatCost" IS NULL OR "retreatCost" >= 0);
