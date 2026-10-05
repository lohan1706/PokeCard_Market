import { TcgdexProvider } from '../../src/ingestion/providers/tcgdex.provider';
import { TcgdexHttp } from '../../src/ingestion/providers/tcgdex.http';
import { ProviderRequestError } from '../../src/ingestion/providers/data-provider';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('TCGdex HTTP client', () => {
  it('retries a 429 and then reads JSON', async () => {
    const urls: string[] = [];
    const http = new TcgdexHttp({
      minDelayMs: 0,
      retryBaseMs: 0,
      fetchImpl: (url) => {
        urls.push(url);
        if (urls.length < 3) {
          return Promise.resolve(jsonResponse(429, { hidden: true }));
        }
        return Promise.resolve(jsonResponse(200, { id: 'fixture' }));
      },
    });

    await expect(http.getJson('/fr/sets/fixture')).resolves.toEqual({ id: 'fixture' });
    expect(urls).toHaveLength(3);
    expect(urls[0]).toBe('https://api.tcgdex.net/v2/fr/sets/fixture');
  });

  it('does not retry a 403 and does not expose the body', async () => {
    let calls = 0;
    const http = new TcgdexHttp({
      minDelayMs: 0,
      retryBaseMs: 0,
      fetchImpl: () => {
        calls += 1;
        return Promise.resolve(jsonResponse(403, { token: 'secret' }));
      },
    });

    await expect(http.getJson('/fr/cards/fixture-1')).rejects.toThrow('HTTP 403');
    expect(calls).toBe(1);
  });

  it('stops after three network failures', async () => {
    let calls = 0;
    const http = new TcgdexHttp({
      minDelayMs: 0,
      retryBaseMs: 0,
      fetchImpl: () => {
        calls += 1;
        return Promise.reject(new Error('socket'));
      },
    });

    await expect(http.getJson('/fr/sets')).rejects.toBeInstanceOf(ProviderRequestError);
    expect(calls).toBe(3);
  });

  it('hydrates only the requested card page', async () => {
    const fetched: string[] = [];
    const http = new TcgdexHttp({
      minDelayMs: 0,
      retryBaseMs: 0,
      fetchImpl: (url) => {
        fetched.push(url);
        if (url.endsWith('/sets/fixture')) {
          return Promise.resolve(
            jsonResponse(200, {
              id: 'fixture',
              cards: [{ id: 'fixture-1' }, { id: 'fixture-2' }, { id: 'fixture-3' }],
            }),
          );
        }
        const id = url.split('/').pop();
        return Promise.resolve(
          jsonResponse(200, { id, localId: '1', name: 'Fixture', set: { id: 'fixture' } }),
        );
      },
    });
    const provider = new TcgdexProvider(http);
    const page = await provider.listCards({ setExternalId: 'fixture', limit: 1, language: 'en' });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe('1');
    expect(fetched).toEqual([
      'https://api.tcgdex.net/v2/en/sets/fixture',
      'https://api.tcgdex.net/v2/en/cards/fixture-1',
    ]);
    await provider.listCards({ setExternalId: 'fixture', limit: 1, language: 'en', cursor: '1' });
    expect(fetched).toHaveLength(3);
    expect(fetched[2]).toBe('https://api.tcgdex.net/v2/en/cards/fixture-2');
  });

  it('refuses an identifier that could change the request path', async () => {
    const http = new TcgdexHttp({
      minDelayMs: 0,
      fetchImpl: () => Promise.reject(new Error('network should not be called')),
    });
    const provider = new TcgdexProvider(http);
    await expect(provider.listCards({ setExternalId: '../admin', limit: 1 })).rejects.toThrow(
      'identifiant externe invalide',
    );
  });
});
