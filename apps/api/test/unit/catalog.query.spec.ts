import { presentCard } from '../../src/catalog/catalog.presenter';
import { escapeLike, likePattern, normalizeCatalogQuery } from '../../src/catalog/catalog.query';

describe('catalog query', () => {
  it('applies defaults and ignores blank filters', () => {
    expect(
      normalizeCatalogQuery({
        name: '  ',
        page: 0,
        pageSize: 500,
        sort: 'nope',
      }),
    ).toEqual({
      name: undefined,
      set: undefined,
      rarity: undefined,
      language: undefined,
      variant: undefined,
      sort: 'name',
      direction: 'asc',
      page: 1,
      pageSize: 48,
    });
  });

  it('keeps an explicit direction and escapes like wildcards', () => {
    expect(
      normalizeCatalogQuery({ sort: 'release', direction: 'asc', page: 2, pageSize: 8 }),
    ).toMatchObject({
      sort: 'release',
      direction: 'asc',
      page: 2,
      pageSize: 8,
    });
    expect(escapeLike('100%_\\')).toBe('100\\%\\_\\\\');
    expect(likePattern('lum')).toBe('%lum%');
  });
});

describe('presentCard', () => {
  it('uses the lowest positive market and formats the day in UTC', () => {
    const card = presentCard({
      id: 'card-1',
      name: 'Voltige',
      number: '012',
      rarity: 'Uncommon',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      hp: 80,
      set: {
        code: 'LUM1',
        name: 'Lumen Démo',
        language: 'fr',
        series: 'Série démo',
        releaseDate: new Date('2024-02-02T00:00:00.000Z'),
      },
      variants: [
        {
          variant: { code: 'REVERSE', name: 'Reverse' },
          prices: [
            {
              market: { toString: () => '1.7' },
              low: { toString: () => '1.53' },
              mid: null,
              high: { toString: () => '1.90' },
              currency: 'USD',
              capturedOn: new Date('2026-10-05T00:00:00.000Z'),
            },
          ],
        },
        {
          variant: { code: 'NORMAL', name: 'Normale' },
          prices: [
            {
              market: { toString: () => '1.15' },
              low: null,
              mid: null,
              high: null,
              currency: 'USD',
              capturedOn: new Date('2026-10-05T00:00:00.000Z'),
            },
          ],
        },
      ],
    });

    expect(card.market).toEqual({ amount: '1.15', currency: 'USD' });
    expect(card.set.releaseDate).toBe('2024-02-02');
    expect(card.variants.map((variant) => variant.market)).toEqual(['1.70', '1.15']);
  });
});
