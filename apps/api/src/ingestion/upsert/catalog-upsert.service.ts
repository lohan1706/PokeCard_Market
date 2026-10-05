import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { normalizeCollectorNumber } from '../domain/numbers';
import type { NormalizedCard, NormalizedPrice, NormalizedSet } from '../domain/normalized';
import { moneyEqual } from '../domain/money';
import { matchCard, matchSet } from '../match/dedup';
import { PrismaService } from '../../prisma/prisma.service';

export type UpsertContext = {
  runId: string;
  providerDbId: string;
  providerCode: string;
};

export type Prepared<T> = {
  raw: unknown;
  value: T;
};

export type ItemFailure = {
  externalId: string | null;
  message: string;
  raw: unknown;
};

export type ItemStats = {
  setsSeen: number;
  cardsSeen: number;
  pricesWritten: number;
  skipped: number;
  errorsCount: number;
};

const EMPTY_STATS: ItemStats = {
  setsSeen: 0,
  cardsSeen: 0,
  pricesWritten: 0,
  skipped: 0,
  errorsCount: 0,
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class CatalogUpsertService {
  constructor(private readonly prisma: PrismaService) {}

  async importSets(
    ctx: UpsertContext,
    items: Prepared<NormalizedSet>[],
    failures: ItemFailure[],
  ): Promise<ItemStats> {
    return this.prisma.$transaction(
      async (tx) => {
        const stats = { ...EMPTY_STATS, setsSeen: items.length + failures.length };
        await this.recordFailures(tx, ctx, 'SET', failures, stats);
        for (const item of items) {
          await this.upsertSet(tx, ctx, item, stats);
        }
        return stats;
      },
      { timeout: 20_000 },
    );
  }

  async importCards(
    ctx: UpsertContext,
    items: Prepared<NormalizedCard>[],
    failures: ItemFailure[],
  ): Promise<ItemStats> {
    return this.prisma.$transaction(
      async (tx) => {
        const stats = { ...EMPTY_STATS, cardsSeen: items.length + failures.length };
        await this.recordFailures(tx, ctx, 'CARD', failures, stats);
        for (const item of items) {
          await this.upsertCard(tx, ctx, item, stats);
        }
        return stats;
      },
      { timeout: 20_000 },
    );
  }

  async importPrices(
    ctx: UpsertContext,
    items: Prepared<NormalizedPrice>[],
    failures: ItemFailure[],
  ): Promise<ItemStats> {
    return this.prisma.$transaction(
      async (tx) => {
        const stats = { ...EMPTY_STATS };
        await this.recordFailures(tx, ctx, 'PRICE', failures, stats);
        for (const item of items) {
          await this.upsertPrice(tx, ctx, item, stats);
        }
        return stats;
      },
      { timeout: 20_000 },
    );
  }

  private async upsertSet(
    tx: Tx,
    ctx: UpsertContext,
    item: Prepared<NormalizedSet>,
    stats: ItemStats,
  ): Promise<void> {
    const value = item.value;
    const identity = await tx.externalIdentity.findUnique({
      where: {
        providerId_entityType_externalId: {
          providerId: ctx.providerDbId,
          entityType: 'SET',
          externalId: value.externalId,
        },
      },
    });
    const existingByCode = await tx.set.findUnique({
      where: { code: value.code },
      select: { id: true },
    });
    const matched = matchSet({
      identityEntityId: identity?.entityId ?? null,
      existingByCode,
    });
    if (matched.action === 'conflict') {
      await this.conflict(
        tx,
        ctx,
        'SET',
        value.externalId,
        matched.reason,
        { code: value.code },
        item.raw,
        stats,
      );
      return;
    }

    const data = {
      name: value.name,
      series: value.series,
      region: value.region,
      releaseDate: value.releaseDate ? utcDay(value.releaseDate) : null,
      logoUrl: value.logoUrl,
      symbolUrl: value.symbolUrl,
      cardCount: value.cardCount,
    };
    const setId =
      matched.action === 'update'
        ? matched.id
        : (
            await tx.set.create({
              data: {
                code: value.code,
                language: value.language,
                ...data,
              },
            })
          ).id;
    if (matched.action === 'update') {
      await tx.set.update({
        where: { id: setId },
        data: omitNull(data),
      });
    }
    if (!identity) {
      await tx.externalIdentity.create({
        data: {
          providerId: ctx.providerDbId,
          entityType: 'SET',
          entityId: setId,
          externalId: value.externalId,
        },
      });
    }
    for (const translation of value.translations) {
      await tx.setTranslation.upsert({
        where: { setId_language: { setId, language: translation.language } },
        create: { setId, ...translation },
        update: omitNull(translation),
      });
    }
    await this.remember(tx, ctx, 'SET', value.externalId, 'IMPORTED', null, item.raw);
  }

  private async upsertCard(
    tx: Tx,
    ctx: UpsertContext,
    item: Prepared<NormalizedCard>,
    stats: ItemStats,
  ): Promise<void> {
    const value = item.value;
    const setId = await this.resolveSetId(tx, ctx, value, item.raw, stats);
    if (!setId) {
      return;
    }
    const identity = await tx.externalIdentity.findUnique({
      where: {
        providerId_entityType_externalId: {
          providerId: ctx.providerDbId,
          entityType: 'CARD',
          externalId: value.externalId,
        },
      },
    });
    const cards = await tx.card.findMany({
      where: { setId },
      select: { id: true, number: true, externalId: true },
    });
    const numberMatches = cards.filter(
      (card) => normalizeCollectorNumber(card.number) === value.normalizedNumber,
    );
    const matched = matchCard({
      identityEntityId: identity?.entityId ?? null,
      numberMatches,
    });
    if (matched.action === 'conflict') {
      await this.conflict(
        tx,
        ctx,
        'CARD',
        value.externalId,
        matched.reason,
        {
          setCode: value.setCode,
          number: value.number,
          candidateIds: matched.candidateIds,
        },
        item.raw,
        stats,
      );
      return;
    }

    const storedExternalId = `${ctx.providerCode}:${value.externalId}`;
    if (storedExternalId.length > 64) {
      await this.failItem(
        tx,
        ctx,
        'CARD',
        value.externalId,
        'Identifiant stocké trop long',
        item.raw,
        stats,
      );
      return;
    }

    let cardId: string;
    if (matched.action === 'create') {
      const taken = await tx.card.findUnique({
        where: { externalId: storedExternalId },
        select: { id: true },
      });
      if (taken) {
        await this.conflict(
          tx,
          ctx,
          'CARD',
          value.externalId,
          'card_external_id_taken',
          { storedExternalId },
          item.raw,
          stats,
        );
        return;
      }
      const created = await tx.card.create({
        data: {
          setId,
          number: value.number,
          name: value.name,
          rarity: value.rarity,
          supertype: value.supertype,
          subtypes: value.subtypes,
          hp: value.hp,
          imageUrl: value.imageUrl,
          imageLargeUrl: value.imageLargeUrl,
          externalId: storedExternalId,
        },
      });
      cardId = created.id;
      await tx.externalIdentity.create({
        data: {
          providerId: ctx.providerDbId,
          entityType: 'CARD',
          entityId: cardId,
          externalId: value.externalId,
        },
      });
    } else {
      const current = cards.find((card) => card.id === matched.id) ?? null;
      if (current && !current.externalId.startsWith(`${ctx.providerCode}:`) && !identity) {
        await this.conflict(
          tx,
          ctx,
          'CARD',
          value.externalId,
          'card_owned_elsewhere',
          {
            candidateIds: [current.id],
          },
          item.raw,
          stats,
        );
        return;
      }
      cardId = matched.id;
      await tx.card.update({
        where: { id: cardId },
        data: omitNull({
          name: value.name,
          rarity: value.rarity,
          supertype: value.supertype,
          hp: value.hp,
          imageUrl: value.imageUrl,
          imageLargeUrl: value.imageLargeUrl,
          subtypes: value.subtypes,
        }),
      });
      if (!identity) {
        await tx.externalIdentity.create({
          data: {
            providerId: ctx.providerDbId,
            entityType: 'CARD',
            entityId: cardId,
            externalId: value.externalId,
          },
        });
      }
    }

    await tx.cardPrinting.upsert({
      where: { cardId },
      create: {
        cardId,
        illustrator: value.illustrator,
        weakness: value.weakness,
        resistance: value.resistance,
        retreatCost: value.retreatCost,
        level: value.level,
        regulationMark: value.regulationMark,
        evolveFrom: value.evolveFrom,
        types: value.types,
      },
      update: omitNull({
        illustrator: value.illustrator,
        weakness: value.weakness,
        resistance: value.resistance,
        retreatCost: value.retreatCost,
        level: value.level,
        regulationMark: value.regulationMark,
        evolveFrom: value.evolveFrom,
        types: value.types,
      }),
    });

    for (const translation of value.translations) {
      await tx.cardTranslation.upsert({
        where: { cardId_language: { cardId, language: translation.language } },
        create: {
          cardId,
          language: translation.language,
          name: translation.name,
          description: translation.description,
          localisedData: translation.localisedData as Prisma.InputJsonValue,
          imageUrl: translation.imageUrl,
          imageLargeUrl: translation.imageLargeUrl,
          thumbnailUrl: translation.thumbnailUrl,
          sourceExternalId: translation.sourceExternalId,
        },
        update: {
          name: translation.name,
          ...omitNull({
            description: translation.description,
            imageUrl: translation.imageUrl,
            imageLargeUrl: translation.imageLargeUrl,
            thumbnailUrl: translation.thumbnailUrl,
          }),
          localisedData: translation.localisedData as Prisma.InputJsonValue,
          sourceExternalId: translation.sourceExternalId,
        },
      });
    }

    for (const code of value.variants) {
      const variant = await tx.variant.findUnique({ where: { code } });
      if (!variant) {
        await tx.ingestionError.create({
          data: {
            runId: ctx.runId,
            externalId: value.externalId,
            message: `Variante référentiel absente: ${code}`,
          },
        });
        stats.errorsCount += 1;
        continue;
      }
      await tx.cardVariant.upsert({
        where: { cardId_variantId: { cardId, variantId: variant.id } },
        create: { cardId, variantId: variant.id, imageUrl: value.imageUrl },
        update: value.imageUrl ? { imageUrl: value.imageUrl } : {},
      });
    }

    await this.remember(tx, ctx, 'CARD', value.externalId, 'IMPORTED', null, item.raw);
  }

  private async upsertPrice(
    tx: Tx,
    ctx: UpsertContext,
    item: Prepared<NormalizedPrice>,
    stats: ItemStats,
  ): Promise<void> {
    const value = item.value;
    const cardId = await this.resolvePriceCard(tx, ctx, value, item.raw, stats);
    if (!cardId) {
      return;
    }
    const variant = await tx.variant.findUnique({ where: { code: value.variant } });
    const cardVariant = variant
      ? await tx.cardVariant.findUnique({
          where: { cardId_variantId: { cardId, variantId: variant.id } },
        })
      : null;
    if (!cardVariant) {
      await this.failItem(
        tx,
        ctx,
        'PRICE',
        value.externalId,
        'Variante non confirmée pour cette carte',
        item.raw,
        stats,
      );
      return;
    }

    const capturedOn = utcDay(value.capturedOn);
    const historyKey = {
      cardVariantId: cardVariant.id,
      providerId: ctx.providerDbId,
      currency: value.currency,
      conditionCode: value.condition,
      capturedOn,
    };
    const existing = await tx.priceHistory.findUnique({
      where: { cardVariantId_providerId_currency_conditionCode_capturedOn: historyKey },
    });
    const changed = existing ? !sameQuote(existing, value) : false;
    if (!existing) {
      await tx.priceHistory.create({
        data: {
          ...historyKey,
          market: value.market,
          low: value.low,
          mid: value.mid,
          high: value.high,
          externalId: value.externalId,
          sourceUrl: value.sourceUrl,
          isCorrected: false,
        },
      });
    } else {
      await tx.priceHistory.update({
        where: { cardVariantId_providerId_currency_conditionCode_capturedOn: historyKey },
        data: {
          market: value.market,
          low: value.low,
          mid: value.mid,
          high: value.high,
          externalId: value.externalId,
          sourceUrl: value.sourceUrl,
          isCorrected: changed ? true : existing.isCorrected,
        },
      });
    }

    const current = await tx.price.findUnique({
      where: {
        cardVariantId_providerId_currency_conditionCode: {
          cardVariantId: cardVariant.id,
          providerId: ctx.providerDbId,
          currency: value.currency,
          conditionCode: value.condition,
        },
      },
    });
    const quote = {
      market: value.market,
      low: value.low,
      mid: value.mid,
      high: value.high,
      capturedOn,
      externalId: value.externalId,
      sourceUrl: value.sourceUrl,
    };
    if (!current) {
      await tx.price.create({
        data: {
          cardVariantId: cardVariant.id,
          providerId: ctx.providerDbId,
          currency: value.currency,
          conditionCode: value.condition,
          ...quote,
        },
      });
    } else if (dayKey(current.capturedOn) <= value.capturedOn) {
      await tx.price.update({
        where: { id: current.id },
        data: quote,
      });
    }

    stats.pricesWritten += 1;
    await this.remember(tx, ctx, 'PRICE', value.externalId, 'IMPORTED', null, item.raw);
  }

  private async resolveSetId(
    tx: Tx,
    ctx: UpsertContext,
    value: NormalizedCard,
    raw: unknown,
    stats: ItemStats,
  ): Promise<string | null> {
    const identity = await tx.externalIdentity.findUnique({
      where: {
        providerId_entityType_externalId: {
          providerId: ctx.providerDbId,
          entityType: 'SET',
          externalId: value.setExternalId,
        },
      },
    });
    const byCode = await tx.set.findUnique({
      where: { code: value.setCode },
      select: { id: true },
    });
    if (!identity && byCode) {
      await this.conflict(
        tx,
        ctx,
        'CARD',
        value.externalId,
        'set_code_conflict',
        { setCode: value.setCode },
        raw,
        stats,
      );
      return null;
    }
    if (!identity) {
      await this.failItem(
        tx,
        ctx,
        'CARD',
        value.externalId,
        'Set introuvable pour cette source',
        raw,
        stats,
      );
      return null;
    }
    if (byCode && byCode.id !== identity.entityId) {
      await this.conflict(
        tx,
        ctx,
        'CARD',
        value.externalId,
        'set_identity_code_mismatch',
        { setCode: value.setCode },
        raw,
        stats,
      );
      return null;
    }
    return identity.entityId;
  }

  private async resolvePriceCard(
    tx: Tx,
    ctx: UpsertContext,
    value: NormalizedPrice,
    raw: unknown,
    stats: ItemStats,
  ): Promise<string | null> {
    const identity = await tx.externalIdentity.findUnique({
      where: {
        providerId_entityType_externalId: {
          providerId: ctx.providerDbId,
          entityType: 'CARD',
          externalId: value.cardExternalId,
        },
      },
    });
    if (identity) {
      return identity.entityId;
    }
    const setIdentity = await tx.externalIdentity.findFirst({
      where: { providerId: ctx.providerDbId, entityType: 'SET', externalId: value.setCode },
    });
    const byCode = await tx.set.findUnique({
      where: { code: value.setCode },
      select: { id: true },
    });
    if (!setIdentity || (byCode && byCode.id !== setIdentity.entityId)) {
      await this.failItem(
        tx,
        ctx,
        'PRICE',
        value.externalId,
        'Carte introuvable pour cette source',
        raw,
        stats,
      );
      return null;
    }
    const cards = await tx.card.findMany({
      where: { setId: setIdentity.entityId },
      select: { id: true, number: true },
    });
    const matches = cards.filter(
      (card) => normalizeCollectorNumber(card.number) === value.normalizedNumber,
    );
    if (matches.length === 1 && matches[0]) {
      return matches[0].id;
    }
    if (matches.length > 1) {
      await this.conflict(
        tx,
        ctx,
        'PRICE',
        value.externalId,
        'card_number_ambiguous',
        {
          candidateIds: matches.map((card) => card.id),
        },
        raw,
        stats,
      );
      return null;
    }
    await this.failItem(
      tx,
      ctx,
      'PRICE',
      value.externalId,
      'Carte introuvable pour cette source',
      raw,
      stats,
    );
    return null;
  }

  private async recordFailures(
    tx: Tx,
    ctx: UpsertContext,
    type: 'SET' | 'CARD' | 'PRICE',
    failures: ItemFailure[],
    stats: ItemStats,
  ): Promise<void> {
    for (const failure of failures) {
      await this.failItem(tx, ctx, type, failure.externalId, failure.message, failure.raw, stats);
    }
  }

  private async failItem(
    tx: Tx,
    ctx: UpsertContext,
    type: 'SET' | 'CARD' | 'PRICE',
    externalId: string | null,
    message: string,
    raw: unknown,
    stats: ItemStats,
  ): Promise<void> {
    const clipped = clip(message);
    stats.skipped += 1;
    stats.errorsCount += 1;
    await tx.ingestionError.create({
      data: { runId: ctx.runId, externalId, message: clipped },
    });
    if (externalId) {
      await this.remember(tx, ctx, type, externalId, 'FAILED', clipped, raw);
    }
  }

  private async conflict(
    tx: Tx,
    ctx: UpsertContext,
    type: 'SET' | 'CARD' | 'PRICE',
    externalId: string,
    reason: string,
    details: Prisma.InputJsonObject,
    raw: unknown,
    stats: ItemStats,
  ): Promise<void> {
    stats.skipped += 1;
    await tx.importConflict.create({
      data: { runId: ctx.runId, reason, externalId, details },
    });
    await this.remember(tx, ctx, type, externalId, 'SKIPPED', reason, raw);
  }

  private async remember(
    tx: Tx,
    ctx: UpsertContext,
    type: 'SET' | 'CARD' | 'PRICE',
    externalId: string,
    status: 'IMPORTED' | 'SKIPPED' | 'FAILED',
    error: string | null,
    raw: unknown,
  ): Promise<void> {
    const payload = boundPayload(raw);
    await tx.importRecord.upsert({
      where: {
        providerId_type_externalId: {
          providerId: ctx.providerDbId,
          type,
          externalId,
        },
      },
      create: {
        providerId: ctx.providerDbId,
        type,
        externalId,
        payload,
        status,
        error,
      },
      update: { payload, status, error, importedAt: new Date() },
    });
  }
}

function utcDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function clip(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function omitNull<T extends Record<string, unknown>>(data: T): Partial<T> {
  const entries = Object.entries(data).filter(([, entry]) => entry !== null && entry !== undefined);
  return Object.fromEntries(entries) as Partial<T>;
}

function sameQuote(
  existing: {
    market: { toString(): string };
    low: { toString(): string } | null;
    mid: { toString(): string } | null;
    high: { toString(): string } | null;
  },
  next: NormalizedPrice,
): boolean {
  return (
    moneyEqual(existing.market.toString(), next.market) &&
    moneyEqual(existing.low?.toString() ?? null, next.low) &&
    moneyEqual(existing.mid?.toString() ?? null, next.mid) &&
    moneyEqual(existing.high?.toString() ?? null, next.high)
  );
}

function boundPayload(raw: unknown): Prisma.InputJsonValue {
  try {
    const encoded = JSON.stringify(raw ?? {});
    if (encoded.length > 32_000) {
      return { truncated: true };
    }
    const parsed: unknown = JSON.parse(encoded);
    if (typeof parsed !== 'object' || parsed === null) {
      return { truncated: true };
    }
    return parsed as Prisma.InputJsonValue;
  } catch {
    return { truncated: true };
  }
}
