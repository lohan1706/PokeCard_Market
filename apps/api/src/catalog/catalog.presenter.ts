export type Money = {
  amount: string;
  currency: string;
};

export type CatalogVariant = {
  code: string;
  name: string;
  market: string | null;
  low: string | null;
  mid: string | null;
  high: string | null;
  currency: string | null;
  capturedOn: string | null;
  source: string | null;
};

export type CatalogCard = {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[];
  hp: number | null;
  imageUrl: string | null;
  market: Money | null;
  set: {
    code: string;
    name: string;
    language: string;
    series: string | null;
    releaseDate: string | null;
  };
  variants: CatalogVariant[];
};

type Amount = { toString(): string };

export type CatalogPriceRow = {
  market: Amount;
  low: Amount | null;
  mid: Amount | null;
  high: Amount | null;
  currency: string;
  capturedOn: Date;
  provider: { code: string; name: string };
};

export type CatalogCardRow = {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[];
  hp: number | null;
  imageUrl: string | null;
  set: {
    code: string;
    name: string;
    language: string;
    series: string | null;
    releaseDate: Date | null;
  };
  variants: Array<{
    variant: { code: string; name: string };
    prices: CatalogPriceRow[];
  }>;
};

export function formatAmount(value: Amount | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value.toString());
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed.toFixed(2);
}

export function formatDay(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function preferredPrice(prices: CatalogPriceRow[]): CatalogPriceRow | undefined {
  const usd = prices.filter((price) => price.currency.trim() === 'USD');
  const pool = usd.length > 0 ? usd : prices;
  return pool[0];
}

export function presentCard(card: CatalogCardRow): CatalogCard {
  const variants = card.variants.map((printing) => {
    const price = preferredPrice(printing.prices);
    return {
      code: printing.variant.code,
      name: printing.variant.name,
      market: formatAmount(price?.market),
      low: formatAmount(price?.low),
      mid: formatAmount(price?.mid),
      high: formatAmount(price?.high),
      currency: price?.currency.trim() ?? null,
      capturedOn: formatDay(price?.capturedOn ?? null),
      source: price?.provider.name ?? null,
    };
  });

  const priced = variants
    .filter((variant) => variant.market !== null && variant.currency)
    .sort((left, right) => Number(left.market) - Number(right.market));
  const usd = priced.filter((variant) => variant.currency === 'USD');
  const lowest = (usd.length > 0 ? usd : priced)[0];

  return {
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity,
    supertype: card.supertype,
    subtypes: card.subtypes,
    hp: card.hp,
    imageUrl: card.imageUrl,
    market:
      lowest?.market && lowest.currency
        ? { amount: lowest.market, currency: lowest.currency }
        : null,
    set: {
      code: card.set.code,
      name: card.set.name,
      language: card.set.language,
      series: card.set.series,
      releaseDate: formatDay(card.set.releaseDate),
    },
    variants,
  };
}
