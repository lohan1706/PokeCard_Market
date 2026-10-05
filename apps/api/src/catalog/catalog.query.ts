export const CATALOG_SORTS = ['name', 'number', 'rarity', 'release', 'price'] as const;
export const CATALOG_DIRECTIONS = ['asc', 'desc'] as const;
export const DEFAULT_PAGE_SIZE = 8;
export const MAX_PAGE_SIZE = 48;

export type CatalogSort = (typeof CATALOG_SORTS)[number];
export type CatalogDirection = (typeof CATALOG_DIRECTIONS)[number];

export type CatalogQueryInput = {
  name?: string;
  set?: string;
  rarity?: string;
  language?: string;
  variant?: string;
  sort?: string;
  direction?: string;
  page?: number;
  pageSize?: number;
};

export type CatalogQuery = {
  name?: string;
  set?: string;
  rarity?: string;
  language?: string;
  variant?: string;
  sort: CatalogSort;
  direction: CatalogDirection;
  page: number;
  pageSize: number;
};

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isSort(value: string | undefined): value is CatalogSort {
  return CATALOG_SORTS.some((sort) => sort === value);
}

function isDirection(value: string | undefined): value is CatalogDirection {
  return CATALOG_DIRECTIONS.some((direction) => direction === value);
}

function defaultDirection(sort: CatalogSort): CatalogDirection {
  return sort === 'release' ? 'desc' : 'asc';
}

export function normalizeCatalogQuery(input: CatalogQueryInput): CatalogQuery {
  const sort = isSort(input.sort) ? input.sort : 'name';
  const page = input.page && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize =
    input.pageSize && input.pageSize > 0
      ? Math.min(Math.floor(input.pageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    name: blankToUndefined(input.name),
    set: blankToUndefined(input.set),
    rarity: blankToUndefined(input.rarity),
    language: blankToUndefined(input.language),
    variant: blankToUndefined(input.variant),
    sort,
    direction: isDirection(input.direction) ? input.direction : defaultDirection(sort),
    page,
    pageSize,
  };
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function likePattern(value: string): string {
  return `%${escapeLike(value)}%`;
}
