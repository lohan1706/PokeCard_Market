import { describe, expect, it } from 'vitest';
import { catalogHref, catalogQueryFromParams, catalogView } from './catalog';

describe('catalog view', () => {
  it('distinguishes loading, empty, error and success', () => {
    expect(catalogView({ status: 'loading', count: 0 })).toBe('loading');
    expect(catalogView({ status: 'error', count: 3 })).toBe('error');
    expect(catalogView({ status: 'ready', count: 0 })).toBe('empty');
    expect(catalogView({ status: 'ready', count: 2 })).toBe('success');
  });

  it('builds a shareable catalog url', () => {
    expect(
      catalogHref({
        name: 'Voltige',
        set: 'LUM1',
        rarity: '',
        language: 'fr',
        variant: 'REVERSE',
        sort: 'price',
        direction: 'desc',
        page: 2,
      }),
    ).toBe(
      '/cards?name=Voltige&set=LUM1&language=fr&variant=REVERSE&sort=price&direction=desc&page=2',
    );

    expect(catalogQueryFromParams({ name: '  Lum  ', page: '3', sort: 'drop' })).toMatchObject({
      name: 'Lum',
      sort: 'name',
      page: 3,
    });
  });
});
