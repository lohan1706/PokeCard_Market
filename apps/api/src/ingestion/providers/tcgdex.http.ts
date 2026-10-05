import { ProviderRequestError } from './data-provider';

export const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';
export const TCGDEX_USER_AGENT = 'PokecardMarket/0.1 (bounded ingestion)';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type TcgdexHttpOptions = {
  fetchImpl?: FetchLike;
  minDelayMs?: number;
  retryBaseMs?: number;
  maxAttempts?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
};

export class TcgdexHttp {
  private readonly fetchImpl: FetchLike;
  private readonly minDelayMs: number;
  private readonly retryBaseMs: number;
  private readonly maxAttempts: number;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, { expires: number; body: unknown }>();

  constructor(options: TcgdexHttpOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.minDelayMs = options.minDelayMs ?? 300;
    this.retryBaseMs = options.retryBaseMs ?? 400;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.cacheTtlMs = options.cacheTtlMs ?? 10 * 60 * 1000;
  }

  async getJson(path: string): Promise<unknown | null> {
    const url = `${TCGDEX_BASE_URL}${path}`;
    const cached = this.cache.get(url);
    if (cached && cached.expires > Date.now()) {
      return cached.body;
    }

    let wait = this.retryBaseMs;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      await sleep(this.minDelayMs);
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: 'GET',
          redirect: 'error',
          headers: {
            accept: 'application/json',
            'user-agent': TCGDEX_USER_AGENT,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch {
        if (attempt === this.maxAttempts) {
          throw new ProviderRequestError('timeout', false);
        }
        await sleep(wait);
        wait *= 2;
        continue;
      }

      if (response.status === 404) {
        return null;
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderRequestError(`HTTP ${response.status}`, false);
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt === this.maxAttempts) {
          throw new ProviderRequestError(`HTTP ${response.status}`, true);
        }
        await sleep(wait);
        wait *= 2;
        continue;
      }
      if (!response.ok) {
        throw new ProviderRequestError(`HTTP ${response.status}`, false);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new ProviderRequestError('invalid JSON', false);
      }
      this.remember(url, body);
      return body;
    }

    throw new ProviderRequestError('timeout', true);
  }

  private remember(url: string, body: unknown): void {
    if (this.cache.size >= 50) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(url, { expires: Date.now() + this.cacheTtlMs, body });
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
