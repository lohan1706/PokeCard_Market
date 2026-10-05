import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { presentCard, type CatalogCard } from './catalog.presenter';
import type { CatalogQuery } from './catalog.query';
import { catalogCardSelect } from './catalog.select';
import { catalogFilterSql, catalogOrderSql } from './catalog.sql';

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

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CatalogQuery): Promise<CatalogPage> {
    const where = catalogFilterSql(query);
    const orderBy = catalogOrderSql(query);
    const skip = (query.page - 1) * query.pageSize;
    const [countRows, idRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COUNT(*)::int AS total
        FROM "Card" c
        JOIN "Set" s ON s.id = c."setId"
        WHERE ${where}
      `,
      this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT c.id
        FROM "Card" c
        JOIN "Set" s ON s.id = c."setId"
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${query.pageSize} OFFSET ${skip}
      `,
    ]);
    const total = countRows[0]?.total ?? 0;
    const ids = idRows.map((row) => row.id);
    if (ids.length === 0) {
      return this.page([], total, query);
    }

    const cards = await this.prisma.card.findMany({
      where: { id: { in: ids } },
      select: catalogCardSelect,
    });
    const byId = new Map(cards.map((card) => [card.id, card]));
    const ordered = ids.flatMap((id) => {
      const card = byId.get(id);
      return card ? [card] : [];
    });
    return this.page(ordered, total, query);
  }

  async detail(id: string): Promise<CatalogCard> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      select: catalogCardSelect,
    });
    if (!card) {
      throw new NotFoundException('Carte introuvable');
    }
    return presentCard(card);
  }

  async filters(): Promise<CatalogFilters> {
    const [sets, rarities, languages, variants] = await Promise.all([
      this.prisma.set.findMany({
        select: { code: true, name: true, language: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.card.findMany({
        where: { rarity: { not: null } },
        distinct: ['rarity'],
        select: { rarity: true },
        orderBy: { rarity: 'asc' },
      }),
      this.prisma.set.findMany({
        distinct: ['language'],
        select: { language: true },
        orderBy: { language: 'asc' },
      }),
      this.prisma.variant.findMany({
        select: { code: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return {
      sets,
      rarities: rarities.flatMap((row) => (row.rarity ? [row.rarity] : [])),
      languages: languages.map((row) => row.language),
      variants,
    };
  }

  private page(
    cards: Prisma.CardGetPayload<{ select: typeof catalogCardSelect }>[],
    total: number,
    query: CatalogQuery,
  ): CatalogPage {
    return {
      items: cards.map((card) => presentCard(card)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }
}
