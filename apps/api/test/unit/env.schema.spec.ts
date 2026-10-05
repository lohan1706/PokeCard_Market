import { parseEnv } from '../../src/config/env.schema';

describe('parseEnv', () => {
  it('accepts a PostgreSQL URL and applies defaults', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgresql://pokecard:pokecard@localhost:5432/pokecard_market',
    });

    expect(env.API_PORT).toBe(3001);
    expect(env.WEB_ORIGIN).toBe('http://localhost:3000');
    expect(env.TCGDEX_SYNC_ENABLED).toBe(false);
  });

  it('rejects a missing database URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-PostgreSQL URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 'mysql://localhost/pokecard' })).toThrow(/PostgreSQL/);
  });
});
