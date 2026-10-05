import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { normalizeCollectorNumber } from '../src/ingestion/domain/numbers';
import {
  normalizeTcgdexCard,
  normalizeTcgdexPrices,
  normalizeTcgdexSet,
} from '../src/ingestion/normalize/tcgdex.normalizer';
import { TcgdexProvider } from '../src/ingestion/providers/tcgdex.provider';
import { TcgdexHttp } from '../src/ingestion/providers/tcgdex.http';
import {
  validateCard,
  validatePrice,
  validateSet,
} from '../src/ingestion/validate/normalized.validator';

const SET_CODE = 'base1';
const LIMIT = 20;
const LANGUAGE = 'fr' as const;

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const before = await prisma.card.count({ where: { externalId: { startsWith: 'demo:' } } });
  const existingSet = await prisma.set.findUnique({
    where: { code: SET_CODE },
    select: { id: true },
  });
  const provider = new TcgdexProvider(new TcgdexHttp());
  const now = new Date();

  const setsPage = await provider.listSets({
    setExternalId: SET_CODE,
    limit: LIMIT,
    language: LANGUAGE,
  });
  const cardsPage = await provider.listCards({
    setExternalId: SET_CODE,
    limit: LIMIT,
    language: LANGUAGE,
  });
  const pricesPage = await provider.listPrices({
    setExternalId: SET_CODE,
    limit: LIMIT,
    language: LANGUAGE,
  });

  const setResults = setsPage.items.map((raw) => {
    const normalized = normalizeTcgdexSet(raw, LANGUAGE);
    if (!normalized.ok) return { ok: false as const, issues: normalized.issues };
    const issues = validateSet(normalized.value, now);
    return issues.length > 0
      ? { ok: false as const, issues }
      : { ok: true as const, value: normalized.value };
  });
  const cardResults = cardsPage.items.map((raw) => {
    const normalized = normalizeTcgdexCard(raw, LANGUAGE);
    if (!normalized.ok)
      return { ok: false as const, issues: normalized.issues, externalId: normalized.externalId };
    const issues = validateCard(normalized.value);
    return issues.length > 0
      ? { ok: false as const, issues, externalId: normalized.value.externalId }
      : { ok: true as const, value: normalized.value };
  });
  const priceIssues: string[] = [];
  const prices = pricesPage.items.flatMap((raw) => {
    const normalized = normalizeTcgdexPrices(raw, LANGUAGE, now);
    priceIssues.push(...normalized.issues);
    return normalized.prices.filter((price) => validatePrice(price, now).length === 0);
  });

  const validCards = cardResults.flatMap((result) => (result.ok ? [result.value] : []));
  const numbers = validCards.map((card) => card.normalizedNumber);
  const duplicateNumbers = numbers.filter((number, index) => numbers.indexOf(number) !== index);
  const after = await prisma.card.count({ where: { externalId: { startsWith: 'demo:' } } });
  await prisma.$disconnect();

  const report = {
    set: setResults.find((result) => result.ok)?.value ?? null,
    fetched: {
      sets: setsPage.items.length,
      cards: cardsPage.items.length,
      pricePayloads: pricesPage.items.length,
      nextCardCursor: cardsPage.nextCursor,
    },
    valid: {
      sets: setResults.filter((result) => result.ok).length,
      cards: validCards.length,
      translations: validCards.reduce((total, card) => total + card.translations.length, 0),
      variants: validCards.reduce((total, card) => total + card.variants.length, 0),
      prices: prices.length,
    },
    invalid: {
      sets: setResults.filter((result) => !result.ok).length,
      cards: cardResults.filter((result) => !result.ok).length,
      priceIssues: priceIssues.length,
    },
    duplicates: duplicateNumbers.length,
    conflicts: existingSet ? 1 : 0,
    existingSet: Boolean(existingSet),
    seedCardsBefore: before,
    seedCardsAfter: after,
    errors: [
      ...setResults.flatMap((result) => (result.ok ? [] : result.issues)),
      ...cardResults.flatMap((result) => (result.ok ? [] : result.issues)),
      ...priceIssues,
    ],
    sample: validCards.slice(0, 5).map((card) => ({
      externalId: card.externalId,
      number: card.number,
      normalizedNumber: normalizeCollectorNumber(card.number),
      name: card.name,
      rarity: card.rarity,
      variants: card.variants,
      image: Boolean(card.imageUrl),
    })),
    priceCurrencies: [
      ...new Set(prices.map((price) => `${price.currency}:${price.variant}:${price.condition}`)),
    ],
  };
  console.log(JSON.stringify(report, null, 2));
}

void main();
