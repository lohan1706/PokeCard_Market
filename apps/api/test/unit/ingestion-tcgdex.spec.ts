import { tcgdexCardFixture } from '../../src/ingestion/fixtures/demo-raw';
import {
  normalizeTcgdexCard,
  normalizeTcgdexPrices,
  normalizeTcgdexSet,
} from '../../src/ingestion/normalize/tcgdex.normalizer';

const now = new Date('2026-10-05T00:00:00.000Z');

describe('TCGdex normalizer', () => {
  it('keeps confirmed variants and builds image URLs', () => {
    const card = normalizeTcgdexCard(tcgdexCardFixture, 'en');
    expect(card.ok).toBe(true);
    if (!card.ok) return;
    expect(card.value.variants).toEqual(['NORMAL', 'REVERSE']);
    expect(card.value.normalizedNumber).toBe('25');
    expect(card.value.number).toBe('025');
    expect(card.value.imageLargeUrl).toBe(
      'https://assets.tcgdex.net/en/fixture/fixture/025/high.webp',
    );
    expect(card.value.thumbnailUrl).toBe(
      'https://assets.tcgdex.net/en/fixture/fixture/025/low.webp',
    );
    expect(card.value.weakness).toBe('Fighting ×2');
    expect(card.value.illustrator).toBe('Artiste Fixture');
  });

  it('maps marketplace blocks without inventing history or a holo variant', () => {
    const result = normalizeTcgdexPrices(tcgdexCardFixture, 'en', now);
    expect(result.issues).toEqual(['Prix cardmarket:HOLO ignoré: variante non confirmée']);
    expect(
      result.prices.map((price) => `${price.currency}:${price.variant}:${price.market}`),
    ).toEqual(['EUR:NORMAL:0.08', 'USD:NORMAL:0.09', 'USD:REVERSE:0.23']);
    const eur = result.prices[0];
    expect(eur?.low).toBe('0.02');
    expect(eur?.mid).toBeNull();
    expect(eur?.condition).toBe('UNSPECIFIED');
    expect(eur?.capturedOn).toBe('2024-10-02');
    expect(result.prices.some((price) => price.market === '0.27' || price.market === '0.03')).toBe(
      false,
    );
  });

  it('normalizes a set brief without a release date', () => {
    const set = normalizeTcgdexSet(
      {
        id: 'fixture',
        name: 'Fixture Set',
        cardCount: { total: 3 },
        logo: 'http://assets.tcgdex.net/logo',
      },
      'fr',
    );
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    expect(set.value.cardCount).toBe(3);
    expect(set.value.logoUrl).toBeNull();
    expect(set.value.releaseDate).toBeNull();
  });
});
