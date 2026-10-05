import { Prisma } from '../generated/prisma/client';

export const catalogCardSelect = {
  id: true,
  name: true,
  number: true,
  rarity: true,
  supertype: true,
  subtypes: true,
  hp: true,
  imageUrl: true,
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
        orderBy: { capturedOn: 'desc' },
        select: {
          market: true,
          low: true,
          mid: true,
          high: true,
          currency: true,
          capturedOn: true,
          provider: { select: { code: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.CardSelect;
