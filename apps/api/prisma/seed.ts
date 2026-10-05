import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  DEMO_CURRENCY,
  DEMO_HISTORY_DAYS,
  demoCards,
  demoExternalId,
  demoPricedVariantCount,
  demoRoles,
  demoSets,
  demoUsers,
  demoVariants,
} from './demo-catalog';
import { hashPassword } from './password';
import { buildDailyMarkets, utcToday } from './price-series';

export type SeedCounts = {
  users: number;
  sets: number;
  cards: number;
  variants: number;
  pricedVariants: number;
  prices: number;
  priceHistory: number;
};

function createPrisma(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export async function seedDemo(prisma: PrismaClient, now = new Date()): Promise<SeedCounts> {
  const endDate = utcToday(now);

  for (const role of demoRoles) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: role,
      update: { label: role.label },
    });
  }

  for (const user of demoUsers) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: user.roleCode } });
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        displayName: user.displayName,
        passwordHash: hashPassword(user.password, user.salt),
        roleId: role.id,
      },
      update: {
        displayName: user.displayName,
        roleId: role.id,
      },
    });
  }

  for (const variant of demoVariants) {
    await prisma.variant.upsert({
      where: { code: variant.code },
      create: variant,
      update: {
        name: variant.name,
        sortOrder: variant.sortOrder,
        fallbackCoefficient: variant.fallbackCoefficient,
      },
    });
  }

  for (const set of demoSets) {
    await prisma.set.upsert({
      where: { code: set.code },
      create: {
        ...set,
        releaseDate: new Date(`${set.releaseDate}T00:00:00.000Z`),
      },
      update: {
        name: set.name,
        series: set.series,
        language: set.language,
        releaseDate: new Date(`${set.releaseDate}T00:00:00.000Z`),
      },
    });
  }

  const provider = await prisma.priceProvider.upsert({
    where: { code: 'SEED' },
    create: {
      code: 'SEED',
      name: 'Jeu de démonstration',
      defaultCurrency: DEMO_CURRENCY,
      isActive: true,
    },
    update: {
      name: 'Jeu de démonstration',
      defaultCurrency: DEMO_CURRENCY,
      isActive: true,
    },
  });

  for (const card of demoCards) {
    const set = await prisma.set.findUniqueOrThrow({ where: { code: card.setCode } });
    const savedCard = await prisma.card.upsert({
      where: { externalId: demoExternalId(card.setCode, card.number) },
      create: {
        setId: set.id,
        number: card.number,
        name: card.name,
        rarity: card.rarity,
        supertype: card.supertype,
        subtypes: card.subtypes,
        hp: card.hp,
        externalId: demoExternalId(card.setCode, card.number),
      },
      update: {
        setId: set.id,
        name: card.name,
        rarity: card.rarity,
        supertype: card.supertype,
        subtypes: card.subtypes,
        hp: card.hp,
      },
    });

    for (const printing of card.printings) {
      const variant = await prisma.variant.findUniqueOrThrow({
        where: { code: printing.variantCode },
      });
      const cardVariant = await prisma.cardVariant.upsert({
        where: { cardId_variantId: { cardId: savedCard.id, variantId: variant.id } },
        create: { cardId: savedCard.id, variantId: variant.id },
        update: {},
      });
      const series = buildDailyMarkets({
        anchor: printing.anchor,
        days: DEMO_HISTORY_DAYS,
        endDate,
        seed: printing.seed,
      });
      const latest = series[series.length - 1];
      if (!latest) {
        throw new Error(`Missing price series for ${card.name}`);
      }

      for (const point of series) {
        await prisma.priceHistory.upsert({
          where: {
            cardVariantId_providerId_currency_conditionCode_capturedOn: {
              cardVariantId: cardVariant.id,
              providerId: provider.id,
              currency: DEMO_CURRENCY,
              conditionCode: 'UNSPECIFIED',
              capturedOn: point.capturedOn,
            },
          },
          create: {
            cardVariantId: cardVariant.id,
            providerId: provider.id,
            currency: DEMO_CURRENCY,
            market: point.market,
            low: point.low,
            mid: point.mid,
            high: point.high,
            capturedOn: point.capturedOn,
          },
          update: {
            market: point.market,
            low: point.low,
            mid: point.mid,
            high: point.high,
            isCorrected: false,
          },
        });
      }

      await prisma.price.upsert({
        where: {
          cardVariantId_providerId_currency_conditionCode: {
            cardVariantId: cardVariant.id,
            providerId: provider.id,
            currency: DEMO_CURRENCY,
            conditionCode: 'UNSPECIFIED',
          },
        },
        create: {
          cardVariantId: cardVariant.id,
          providerId: provider.id,
          currency: DEMO_CURRENCY,
          market: latest.market,
          low: latest.low,
          mid: latest.mid,
          high: latest.high,
          capturedOn: latest.capturedOn,
        },
        update: {
          market: latest.market,
          low: latest.low,
          mid: latest.mid,
          high: latest.high,
          capturedOn: latest.capturedOn,
        },
      });
    }
  }

  return {
    users: demoUsers.length,
    sets: demoSets.length,
    cards: demoCards.length,
    variants: demoVariants.length,
    pricedVariants: demoPricedVariantCount,
    prices: demoPricedVariantCount,
    priceHistory: demoPricedVariantCount * DEMO_HISTORY_DAYS,
  };
}

export async function runSeed(now = new Date()): Promise<SeedCounts> {
  const prisma = createPrisma();
  try {
    return await seedDemo(prisma, now);
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');

if (invokedDirectly) {
  runSeed()
    .then((counts) => {
      console.log(
        `Seed démo : ${counts.users} utilisateurs, ${counts.sets} extensions, ${counts.cards} cartes, ${counts.pricedVariants} déclinaisons, ${counts.priceHistory} points d'historique.`,
      );
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
