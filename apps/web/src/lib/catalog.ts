export type CatalogMoney = {
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
};

export type CatalogCard = {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[];
  hp: number | null;
  market: CatalogMoney | null;
  set: {
    code: string;
    name: string;
    language: string;
    series: string | null;
    releaseDate: string | null;
  };
  variants: CatalogVariant[];
};

export type CatalogPage = {
  items: CatalogCard[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type CatalogFilters = {
  sets: Array<{ code: string; name: string; language: string }>;
  rarities: string[];
  languages: string[];
  variants: Array<{ code: string; name: string }>;
};

export type CatalogQuery = {
  name: string;
  set: string;
  rarity: string;
  language: string;
  variant: string;
  sort: string;
  direction: string;
  page: number;
};

export type CatalogView = 'loading' | 'empty' | 'error' | 'success';

export const EMPTY_CATALOG_QUERY: CatalogQuery = {
  name: '',
  set: '',
  rarity: '',
  language: '',
  variant: '',
  sort: 'name',
  direction: 'asc',
  page: 1,
};

const SORTS = new Set(['name', 'number', 'rarity', 'release', 'price']);
const DIRECTIONS = new Set(['asc', 'desc']);

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function catalogQueryFromParams(
  params: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const sort = one(params.sort);
  const direction = one(params.direction);
  const page = Number(one(params.page));
  return {
    name: one(params.name).trim(),
    set: one(params.set).trim(),
    rarity: one(params.rarity).trim(),
    language: one(params.language).trim(),
    variant: one(params.variant).trim(),
    sort: SORTS.has(sort) ? sort : 'name',
    direction: DIRECTIONS.has(direction) ? direction : 'asc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function catalogHref(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.name) {
    params.set('name', query.name);
  }
  if (query.set) {
    params.set('set', query.set);
  }
  if (query.rarity) {
    params.set('rarity', query.rarity);
  }
  if (query.language) {
    params.set('language', query.language);
  }
  if (query.variant) {
    params.set('variant', query.variant);
  }
  if (query.sort !== 'name') {
    params.set('sort', query.sort);
  }
  if (query.direction !== 'asc') {
    params.set('direction', query.direction);
  }
  if (query.page > 1) {
    params.set('page', String(query.page));
  }
  const search = params.toString();
  return search ? `/cards?${search}` : '/cards';
}

export function catalogApiPath(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.name) {
    params.set('name', query.name);
  }
  if (query.set) {
    params.set('set', query.set);
  }
  if (query.rarity) {
    params.set('rarity', query.rarity);
  }
  if (query.language) {
    params.set('language', query.language);
  }
  if (query.variant) {
    params.set('variant', query.variant);
  }
  params.set('sort', query.sort);
  params.set('direction', query.direction);
  params.set('page', String(query.page));
  return `/cards?${params.toString()}`;
}

export function catalogView(input: {
  status: 'loading' | 'error' | 'ready';
  count: number;
}): CatalogView {
  if (input.status === 'loading') {
    return 'loading';
  }
  if (input.status === 'error') {
    return 'error';
  }
  return input.count === 0 ? 'empty' : 'success';
}

export function formatMarket(market: CatalogMoney | null): string {
  if (!market) {
    return 'Prix indisponible';
  }
  return `${market.amount} ${market.currency}`;
}

export function isCatalogPage(value: unknown): value is CatalogPage {
  if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) {
    return false;
  }
  return value.items.every(
    (item) => item && typeof item === 'object' && 'id' in item && 'name' in item,
  );
}

export function isCatalogFilters(value: unknown): value is CatalogFilters {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.sets) &&
    Array.isArray(record.rarities) &&
    Array.isArray(record.languages) &&
    Array.isArray(record.variants)
  );
}

export function isCatalogCard(value: unknown): value is CatalogCard {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    Array.isArray(record.variants)
  );
}
