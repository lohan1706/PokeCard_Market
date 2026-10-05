import { PrismaService } from '../src/prisma/prisma.service';

async function main(): Promise<void> {
  const prisma = new PrismaService();
  await prisma.$connect();

  const tcgdex = await prisma.priceProvider.findUnique({ where: { code: 'TCGDEX' } });
  const seed = await prisma.priceProvider.findUnique({ where: { code: 'SEED' } });

  const set = await prisma.set.findUnique({
    where: { code: 'base1' },
    include: { translations: true },
  });

  const cards = set
    ? await prisma.card.findMany({
        where: { setId: set.id },
        orderBy: { number: 'asc' },
        include: {
          translations: true,
          printing: true,
          variants: {
            include: {
              variant: true,
              prices: { include: { provider: true } },
              priceHistory: true,
            },
          },
        },
      })
    : [];

  const seedCards = await prisma.card.findMany({
    where: { externalId: { startsWith: 'demo:' } },
    orderBy: { externalId: 'asc' },
    select: {
      externalId: true,
      name: true,
      number: true,
      updatedAt: true,
      set: { select: { code: true, name: true } },
    },
  });

  const identities = tcgdex
    ? await prisma.externalIdentity.groupBy({
        by: ['entityType'],
        where: { providerId: tcgdex.id },
        _count: true,
      })
    : [];

  const records = tcgdex
    ? await prisma.importRecord.groupBy({
        by: ['type', 'status'],
        where: { providerId: tcgdex.id },
        _count: true,
      })
    : [];

  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: 'asc' },
    include: {
      provider: { select: { code: true } },
      _count: { select: { errors: true, conflicts: true } },
    },
  });

  const errors = await prisma.ingestionError.groupBy({
    by: ['message'],
    _count: true,
  });

  const conflictCount = await prisma.importConflict.count();

  const priceAgg = await prisma.price.groupBy({
    by: ['currency', 'conditionCode'],
    where: { providerId: tcgdex?.id },
    _count: true,
  });

  const historyCount = tcgdex
    ? await prisma.priceHistory.count({ where: { providerId: tcgdex.id } })
    : 0;
  const seedPriceCount = seed ? await prisma.price.count({ where: { providerId: seed.id } }) : 0;
  const seedHistoryCount = seed
    ? await prisma.priceHistory.count({ where: { providerId: seed.id } })
    : 0;

  const sample = cards
    .filter((card) => ['1', '4', '20'].includes(card.number))
    .map((card) => ({
      number: card.number,
      name: card.name,
      rarity: card.rarity,
      imageUrl: card.imageUrl,
      externalId: card.externalId,
      translations: card.translations.map((row) => ({
        language: row.language,
        name: row.name,
        imageUrl: row.imageUrl,
      })),
      printing: card.printing,
      variants: card.variants.map((row) => ({
        code: row.variant.code,
        imageUrl: row.imageUrl,
        prices: row.prices.map((price) => ({
          currency: price.currency,
          condition: price.conditionCode,
          market: price.market.toString(),
          low: price.low?.toString() ?? null,
          provider: price.provider.code,
          capturedOn: price.capturedOn.toISOString().slice(0, 10),
        })),
        history: row.priceHistory.length,
      })),
    }));

  const missing = {
    name: cards.filter((card) => !card.name).length,
    number: cards.filter((card) => !card.number).length,
    rarity: cards.filter((card) => !card.rarity).length,
    image: cards.filter((card) => !card.imageUrl?.startsWith('https://')).length,
    translation: cards.filter((card) => card.translations.length === 0).length,
    variant: cards.filter((card) => card.variants.length === 0).length,
  };

  const variantCodes = new Map<string, number>();
  for (const card of cards) {
    for (const row of card.variants) {
      variantCodes.set(row.variant.code, (variantCodes.get(row.variant.code) ?? 0) + 1);
    }
  }

  console.log(
    JSON.stringify(
      {
        set: set && {
          code: set.code,
          name: set.name,
          language: set.language,
          series: set.series,
          region: set.region,
          releaseDate: set.releaseDate?.toISOString().slice(0, 10) ?? null,
          cardCount: set.cardCount,
          logoUrl: set.logoUrl,
          symbolUrl: set.symbolUrl,
          translations: set.translations.map((row) => ({
            language: row.language,
            name: row.name,
          })),
        },
        cardCount: cards.length,
        numbers: cards.map((card) => card.number),
        names: cards.map((card) => `${card.number} ${card.name}`),
        missing,
        variantCodes: Object.fromEntries(variantCodes),
        sample,
        identities,
        records,
        runs: runs.map((run) => ({
          id: run.id,
          provider: run.provider.code,
          jobType: run.jobType,
          status: run.status,
          setsSeen: run.setsSeen,
          cardsSeen: run.cardsSeen,
          pricesWritten: run.pricesWritten,
          skipped: run.skipped,
          errorsCount: run.errorsCount,
          errorRows: run._count.errors,
          conflictRows: run._count.conflicts,
        })),
        errors,
        conflictCount,
        priceAgg,
        historyCount,
        seedCards: seedCards.length,
        seedCodes: [...new Set(seedCards.map((card) => card.set.code))],
        seedNames: seedCards.map((card) => `${card.set.code} ${card.number} ${card.name}`),
        seedPriceCount,
        seedHistoryCount,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

void main();
