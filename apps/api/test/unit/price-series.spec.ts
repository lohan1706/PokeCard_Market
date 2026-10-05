import { addUtcDays, buildDailyMarkets, utcDate } from '../../prisma/price-series';

describe('buildDailyMarkets', () => {
  const endDate = utcDate(2026, 9, 5);

  it('builds one positive point per day ending on the requested date', () => {
    const points = buildDailyMarkets({ anchor: 10, days: 45, endDate, seed: 7 });

    expect(points).toHaveLength(45);
    expect(points[0]?.capturedOn.toISOString()).toBe(addUtcDays(endDate, -44).toISOString());
    expect(points[44]?.capturedOn.toISOString()).toBe(endDate.toISOString());
    for (const point of points) {
      expect(Number(point.market)).toBeGreaterThan(0);
      expect(Number(point.low)).toBeLessThanOrEqual(Number(point.mid));
      expect(Number(point.mid)).toBeLessThanOrEqual(Number(point.high));
    }
  });

  it('is stable for the same seed', () => {
    const first = buildDailyMarkets({ anchor: 4.8, days: 10, endDate, seed: 104 });
    const second = buildDailyMarkets({ anchor: 4.8, days: 10, endDate, seed: 104 });

    expect(second).toEqual(first);
  });
});
