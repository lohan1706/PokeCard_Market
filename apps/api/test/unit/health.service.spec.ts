import { HealthService } from '../../src/health/health.service';
import type { PrismaService } from '../../src/prisma/prisma.service';

describe('HealthService', () => {
  it('reports the database as up when the probe succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([1]),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.check()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('reports the database as down when the probe fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as PrismaService;
    const service = new HealthService(prisma);

    await expect(service.check()).resolves.toEqual({ status: 'degraded', database: 'down' });
  });
});
