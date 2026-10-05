import { Prisma } from '../generated/prisma/client';
import type { CatalogQuery } from './catalog.query';
import { likePattern } from './catalog.query';

const MIN_USD_PRICE = Prisma.sql`(
  SELECT MIN(p.market)
  FROM "CardVariant" cv
  JOIN "Price" p ON p."cardVariantId" = cv.id AND p.currency = 'USD'
  WHERE cv."cardId" = c.id
)`;

export function catalogFilterSql(query: CatalogQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  if (query.name) {
    const pattern = likePattern(query.name);
    parts.push(
      Prisma.sql`(c.name ILIKE ${pattern} ESCAPE '\\' OR c.number ILIKE ${pattern} ESCAPE '\\')`,
    );
  }
  if (query.set) {
    parts.push(Prisma.sql`s.code = ${query.set}`);
  }
  if (query.rarity) {
    parts.push(Prisma.sql`c.rarity = ${query.rarity}`);
  }
  if (query.language) {
    parts.push(Prisma.sql`s.language = ${query.language}`);
  }
  if (query.variant) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM "CardVariant" cv
      JOIN "Variant" v ON v.id = cv."variantId"
      WHERE cv."cardId" = c.id AND v.code = ${query.variant}
    )`);
  }
  if (parts.length === 0) {
    return Prisma.sql`TRUE`;
  }
  return Prisma.join(parts, ' AND ');
}

export function catalogOrderSql(query: CatalogQuery): Prisma.Sql {
  const direction = Prisma.raw(query.direction === 'desc' ? 'DESC' : 'ASC');
  switch (query.sort) {
    case 'number':
      return Prisma.sql`c.number ${direction}, c.name ASC`;
    case 'rarity':
      return Prisma.sql`c.rarity ${direction} NULLS LAST, c.name ASC`;
    case 'release':
      return Prisma.sql`s."releaseDate" ${direction} NULLS LAST, c.number ASC`;
    case 'price':
      return Prisma.sql`${MIN_USD_PRICE} ${direction} NULLS LAST, c.name ASC`;
    default:
      return Prisma.sql`c.name ${direction}, c.number ASC`;
  }
}
