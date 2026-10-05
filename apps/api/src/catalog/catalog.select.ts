import { Prisma } from '../generated/prisma/client';

export const catalogCardSelect = {
  id: true,
  name: true,
  number: true,
  rarity: true,
  supertype: true,
  subtypes: true,
  hp: true,
  set: {
    select: {
      code: true,
      name: true,
      language: true,
      series: true,
      releaseDate: true,
    },
  },
  variants: {
    orderBy: { variant: { sortOrder: 'asc' } },
    select: {
      variant: { select: { code: true, name: true } },
      prices: {
        where: { currency: 'USD' },
        orderBy: { capturedOn: 'desc' },
        take: 1,
        select: {
          market: true,
          low: true,
          mid: true,
          high: true,
          currency: true,
          capturedOn: true,
        },
      },
    },
  },
} satisfies Prisma.CardSelect;
