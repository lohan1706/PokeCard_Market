export function sanitizeHttpsUrl(value: unknown, allowedHosts: ReadonlySet<string>): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    return null;
  }
  if (!allowedHosts.has(url.hostname)) {
    return null;
  }
  return url.toString();
}

export const DEMO_URL_HOSTS = new Set(['example.test']);

export const TCGDEX_URL_HOSTS = new Set(['assets.tcgdex.net', 'api.tcgdex.net']);
