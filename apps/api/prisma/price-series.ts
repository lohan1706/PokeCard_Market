export type PricePoint = {
  capturedOn: Date;
  market: string;
  low: string;
  mid: string;
  high: string;
};

export function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function utcToday(now = new Date()): Date {
  return utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function money(value: number): string {
  return value.toFixed(2);
}

export function buildDailyMarkets(input: {
  anchor: number;
  days: number;
  endDate: Date;
  seed: number;
}): PricePoint[] {
  if (input.days < 1) {
    throw new Error('days must be at least 1');
  }
  if (input.anchor <= 0) {
    throw new Error('anchor must be positive');
  }

  const random = createRng(input.seed);
  const points: PricePoint[] = [];
  let market = input.anchor;

  for (let offset = input.days - 1; offset >= 0; offset -= 1) {
    const drift = (random() - 0.48) * 0.08;
    market = Math.max(0.05, market * (1 + drift));
    const rounded = Number(market.toFixed(2));
    const low = Number((rounded * 0.9).toFixed(2));
    const high = Number((rounded * 1.12).toFixed(2));
    points.push({
      capturedOn: addUtcDays(input.endDate, -offset),
      market: money(rounded),
      low: money(low),
      mid: money(rounded),
      high: money(high),
    });
  }

  return points;
}
