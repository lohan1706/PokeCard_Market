-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Extensions required by citext emails and trigram search
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "AlertDirection" AS ENUM ('ABOVE', 'BELOW');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PRICE_ALERT', 'ACCOUNT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "label" VARCHAR(80) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "disabledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Set" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "series" VARCHAR(120),
    "language" VARCHAR(8) NOT NULL,
    "releaseDate" DATE,
    "logoUrl" TEXT,
    "symbolUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" UUID NOT NULL,
    "setId" UUID NOT NULL,
    "number" VARCHAR(16) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "rarity" VARCHAR(80),
    "supertype" VARCHAR(40),
    "subtypes" TEXT[],
    "hp" INTEGER,
    "imageUrl" TEXT,
    "imageLargeUrl" TEXT,
    "externalId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "fallbackCoefficient" DECIMAL(6,4) NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardVariant" (
    "id" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CardVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceProvider" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "baseUrl" TEXT,
    "defaultCurrency" CHAR(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PriceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" UUID NOT NULL,
    "cardVariantId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "market" DECIMAL(12,2) NOT NULL,
    "low" DECIMAL(12,2),
    "mid" DECIMAL(12,2),
    "high" DECIMAL(12,2),
    "capturedOn" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" UUID NOT NULL,
    "cardVariantId" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "market" DECIMAL(12,2) NOT NULL,
    "low" DECIMAL(12,2),
    "mid" DECIMAL(12,2),
    "high" DECIMAL(12,2),
    "capturedOn" DATE NOT NULL,
    "isCorrected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "coefficient" DECIMAL(6,4) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "cardVariantId" UUID NOT NULL,
    "conditionId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "acquiredPrice" DECIMAL(12,2),
    "acquiredCurrency" CHAR(3),
    "acquiredAt" DATE,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardVariantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardVariantId" UUID NOT NULL,
    "direction" "AlertDirection" NOT NULL,
    "threshold" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "lastTriggeredAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" UUID NOT NULL,
    "priceAlertId" UUID NOT NULL,
    "market" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "triggeredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "priceAlertId" UUID,
    "alertEventId" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionValuation" (
    "collectionId" UUID NOT NULL,
    "valuedOn" DATE NOT NULL,
    "marketValue" DECIMAL(14,2) NOT NULL,
    "costBasis" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionValuation_pkey" PRIMARY KEY ("collectionId","valuedOn")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "userAgent" VARCHAR(255),
    "ip" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "status" "IngestionStatus" NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(6),
    "cardsSeen" INTEGER NOT NULL DEFAULT 0,
    "pricesWritten" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Set_code_key" ON "Set"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Card_externalId_key" ON "Card"("externalId");

-- CreateIndex
CREATE INDEX "Card_setId_idx" ON "Card"("setId");

-- CreateIndex
CREATE INDEX "Card_name_trgm_idx" ON "Card" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "Card_setId_number_key" ON "Card"("setId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_code_key" ON "Variant"("code");

-- CreateIndex
CREATE INDEX "CardVariant_cardId_idx" ON "CardVariant"("cardId");

-- CreateIndex
CREATE INDEX "CardVariant_variantId_idx" ON "CardVariant"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "CardVariant_cardId_variantId_key" ON "CardVariant"("cardId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceProvider_code_key" ON "PriceProvider"("code");

-- CreateIndex
CREATE INDEX "Price_providerId_capturedOn_idx" ON "Price"("providerId", "capturedOn");

-- CreateIndex
CREATE UNIQUE INDEX "Price_cardVariantId_providerId_currency_key" ON "Price"("cardVariantId", "providerId", "currency");

-- CreateIndex
CREATE INDEX "PriceHistory_cardVariantId_currency_capturedOn_idx" ON "PriceHistory"("cardVariantId", "currency", "capturedOn" DESC);

-- CreateIndex
CREATE INDEX "PriceHistory_providerId_capturedOn_idx" ON "PriceHistory"("providerId", "capturedOn");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_cardVariantId_providerId_currency_capturedOn_key" ON "PriceHistory"("cardVariantId", "providerId", "currency", "capturedOn");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_code_key" ON "Condition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_key" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_idx" ON "CollectionItem"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionItem_cardVariantId_idx" ON "CollectionItem"("cardVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_cardVariantId_conditionId_key" ON "CollectionItem"("collectionId", "cardVariantId", "conditionId");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_cardVariantId_key" ON "WatchlistItem"("userId", "cardVariantId");

-- CreateIndex
CREATE INDEX "PriceAlert_userId_idx" ON "PriceAlert"("userId");

-- CreateIndex
CREATE INDEX "PriceAlert_isActive_cardVariantId_idx" ON "PriceAlert"("isActive", "cardVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceAlert_userId_cardVariantId_direction_currency_threshol_key" ON "PriceAlert"("userId", "cardVariantId", "direction", "currency", "threshold");

-- CreateIndex
CREATE INDEX "AlertEvent_priceAlertId_triggeredAt_idx" ON "AlertEvent"("priceAlertId", "triggeredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_alertEventId_key" ON "Notification"("alertEventId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "IngestionRun_providerId_startedAt_idx" ON "IngestionRun"("providerId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVariant" ADD CONSTRAINT "CardVariant_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVariant" ADD CONSTRAINT "CardVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_cardVariantId_fkey" FOREIGN KEY ("cardVariantId") REFERENCES "CardVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_cardVariantId_fkey" FOREIGN KEY ("cardVariantId") REFERENCES "CardVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_cardVariantId_fkey" FOREIGN KEY ("cardVariantId") REFERENCES "CardVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_cardVariantId_fkey" FOREIGN KEY ("cardVariantId") REFERENCES "CardVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_cardVariantId_fkey" FOREIGN KEY ("cardVariantId") REFERENCES "CardVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_priceAlertId_fkey" FOREIGN KEY ("priceAlertId") REFERENCES "PriceAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_priceAlertId_fkey" FOREIGN KEY ("priceAlertId") REFERENCES "PriceAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alertEventId_fkey" FOREIGN KEY ("alertEventId") REFERENCES "AlertEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionValuation" ADD CONSTRAINT "CollectionValuation_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PriceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial indexes for active alerts and unread notifications
CREATE INDEX "PriceAlert_active_cardVariantId_idx" ON "PriceAlert"("cardVariantId") WHERE "isActive" = true;
CREATE INDEX "Notification_unread_userId_idx" ON "Notification"("userId") WHERE "readAt" IS NULL;

-- Financial and domain checks
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_fallbackCoefficient_check" CHECK ("fallbackCoefficient" >= 0 AND "fallbackCoefficient" <= 2);
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_coefficient_check" CHECK ("coefficient" >= 0 AND "coefficient" <= 2);
ALTER TABLE "Card" ADD CONSTRAINT "Card_hp_check" CHECK ("hp" IS NULL OR "hp" >= 0);
ALTER TABLE "Price" ADD CONSTRAINT "Price_amounts_check" CHECK ("market" >= 0 AND ("low" IS NULL OR "low" >= 0) AND ("mid" IS NULL OR "mid" >= 0) AND ("high" IS NULL OR "high" >= 0));
ALTER TABLE "Price" ADD CONSTRAINT "Price_capturedOn_check" CHECK ("capturedOn" <= CURRENT_DATE);
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_amounts_check" CHECK ("market" >= 0 AND ("low" IS NULL OR "low" >= 0) AND ("mid" IS NULL OR "mid" >= 0) AND ("high" IS NULL OR "high" >= 0));
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_capturedOn_check" CHECK ("capturedOn" <= CURRENT_DATE);
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_quantity_check" CHECK ("quantity" >= 1 AND "quantity" <= 9999);
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_acquired_check" CHECK (("acquiredPrice" IS NULL AND "acquiredCurrency" IS NULL) OR ("acquiredPrice" IS NOT NULL AND "acquiredPrice" >= 0 AND "acquiredCurrency" IS NOT NULL));
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_threshold_check" CHECK ("threshold" > 0);
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_market_check" CHECK ("market" >= 0);
ALTER TABLE "CollectionValuation" ADD CONSTRAINT "CollectionValuation_amounts_check" CHECK ("marketValue" >= 0 AND "costBasis" >= 0);
