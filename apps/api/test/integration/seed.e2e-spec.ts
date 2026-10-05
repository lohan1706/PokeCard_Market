import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { DEMO_CURRENCY, demoExternalId } from '../../prisma/demo-catalog';
import { runSeed } from '../../prisma/seed';

describe('demo seed', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('loads fictional catalog data twice without duplicating prices', async () => {
    const first = await runSeed();
    const historyAfterFirst = await prisma.priceHistory.count({
      where: { provider: { code: 'SEED' } },
    });
    const second = await runSeed();
    const historyAfterSecond = await prisma.priceHistory.count({
      where: { provider: { code: 'SEED' } },
    });

    expect(second).toEqual(first);
    expect(first.users).toBe(3);
    expect(first.cards).toBe(9);
    expect(historyAfterSecond).toBe(historyAfterFirst);
    expect(historyAfterFirst).toBe(first.pricedVariants * 45);

    const card = await prisma.card.findUniqueOrThrow({
      where: { externalId: demoExternalId('LUM1', '186') },
    });
    const prices = await prisma.price.findMany({
      where: { cardVariant: { cardId: card.id }, currency: DEMO_CURRENCY },
    });
    const current = prices[0];
    expect(current).toBeDefined();
    if (!current) {
      return;
    }

    const latestHistory = await prisma.priceHistory.findFirstOrThrow({
      where: { cardVariantId: current.cardVariantId, currency: DEMO_CURRENCY },
      orderBy: { capturedOn: 'desc' },
    });
    expect(latestHistory.market.toString()).toBe(current.market.toString());
    expect(latestHistory.capturedOn.toISOString()).toBe(current.capturedOn.toISOString());
  }, 120000);
});
