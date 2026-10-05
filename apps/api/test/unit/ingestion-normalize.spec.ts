import { mapCondition } from '../../src/ingestion/domain/conditions';
import { mapLanguage } from '../../src/ingestion/domain/languages';
import { fromCents, moneyEqual, toCents } from '../../src/ingestion/domain/money';
import { normalizeCollectorNumber } from '../../src/ingestion/domain/numbers';
import {
  normalizeDemoCard,
  normalizeDemoPrice,
  normalizeDemoSet,
} from '../../src/ingestion/normalize/demo.normalizer';
import { validatePrice } from '../../src/ingestion/validate/normalized.validator';
import { demoRawCards, demoRawPrices, demoRawSets } from '../../src/ingestion/fixtures/demo-raw';

describe('ingestion normalization', () => {
  it('maps languages without adding a column per language', () => {
    expect(mapLanguage('français')).toBe('fr');
    expect(mapLanguage('english')).toBe('en');
    expect(mapLanguage('ja')).toBe('ja');
    expect(mapLanguage('deutsch')).toBe('de');
    expect(mapLanguage('español')).toBe('es');
    expect(mapLanguage('italiano')).toBe('it');
    expect(mapLanguage('pt-BR')).toBe('pt-BR');
    expect(mapLanguage('korean')).toBe('ko');
    expect(mapLanguage('zh-cn')).toBe('zh-Hans');
    expect(mapLanguage('zh-tw')).toBe('zh-Hant');
    expect(mapLanguage('klingon')).toBeNull();
  });

  it('maps known conditions and refuses an unknown grade', () => {
    expect(mapCondition('Near Mint')).toEqual({ ok: true, value: 'NM' });
    expect(mapCondition('')).toEqual({ ok: true, value: 'UNSPECIFIED' });
    expect(mapCondition(null)).toEqual({ ok: true, value: 'UNSPECIFIED' });
    expect(mapCondition('Scratched').ok).toBe(false);
    expect(mapCondition('Scratched', new Map([['SCRATCHED', 'HP']]))).toEqual({
      ok: true,
      value: 'HP',
    });
  });

  it('normalizes collector numbers without treating 25 and 025 as different', () => {
    expect(normalizeCollectorNumber('025')).toBe('25');
    expect(normalizeCollectorNumber('25')).toBe('25');
    expect(normalizeCollectorNumber('025a')).toBe('25a');
    expect(normalizeCollectorNumber('TG01')).toBe('tg01');
    expect(normalizeCollectorNumber('000')).toBe('0');
  });

  it('keeps money on cent boundaries', () => {
    expect(toCents('1.20')).toBe(120n);
    expect(fromCents(120n + 130n)).toBe('2.50');
    expect(moneyEqual('1.2', '1.20')).toBe(true);
    expect(normalizeMoneyUnsafe('10.10')).toBe('10.10');
  });

  it('normalizes a demo set, card and price from fixtures', () => {
    const set = normalizeDemoSet(demoRawSets[0]);
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    expect(set.value.language).toBe('fr');
    expect(set.value.translations.map((item) => item.language).sort()).toEqual(['en', 'fr']);

    const card = normalizeDemoCard(demoRawCards[0]);
    expect(card.ok).toBe(true);
    if (!card.ok) return;
    expect(card.value.number).toBe('025');
    expect(card.value.normalizedNumber).toBe('25');
    expect(card.value.variants).toEqual(['NORMAL', 'REVERSE']);
    expect(card.value.translations.map((item) => item.name)).toEqual([
      'Pikachu Fixture',
      'Fixture Pikachu',
    ]);
    expect(card.value.imageUrl).toBe('https://example.test/ingest/025');

    const price = normalizeDemoPrice(demoRawPrices[0]);
    expect(price.ok).toBe(true);
    if (!price.ok) return;
    expect(price.value.condition).toBe('NM');
    expect(price.value.market).toBe('1.50');
    expect(price.value.currency).toBe('USD');
  });

  it('rejects an unconfirmed foil price, an unknown condition and a future date', () => {
    const foil = normalizeDemoPrice(demoRawPrices[5]);
    expect(foil.ok).toBe(false);
    const scratched = normalizeDemoPrice(demoRawPrices[3]);
    expect(scratched.ok).toBe(false);
    const valid = normalizeDemoPrice(demoRawPrices[1]);
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    expect(
      validatePrice(
        { ...valid.value, capturedOn: '2999-01-01' },
        new Date('2026-10-05T00:00:00.000Z'),
      ),
    ).toContain('Date future');
    expect(validatePrice({ ...valid.value, currency: 'US' })).toContain('Devise invalide');
    expect(validatePrice({ ...valid.value, market: '-1.00' })).toContain('Montant invalide');
  });

  it('rejects an incomplete card and drops a non-https image', () => {
    const incomplete = normalizeDemoCard({
      id: 'x',
      setId: 's',
      setCode: 'INGEST1',
      localId: '1',
      lang: 'fr',
    });
    expect(incomplete.ok).toBe(false);
    const unsafe = normalizeDemoCard({
      ...demoRawCards[1],
      image: 'javascript:alert(1)',
    });
    expect(unsafe.ok).toBe(true);
    if (!unsafe.ok) return;
    expect(unsafe.value.imageUrl).toBeNull();
  });
});

function normalizeMoneyUnsafe(value: string): string {
  const cents = toCents(value);
  if (cents === null) {
    throw new Error('invalid');
  }
  return fromCents(cents);
}
