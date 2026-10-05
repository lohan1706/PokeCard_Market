import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('catalog', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists, filters, sorts and paginates without a query per card', async () => {
    const queryRaw = jest.spyOn(prisma, '$queryRaw');
    const findMany = jest.spyOn(prisma.card, 'findMany');

    const page = await request(app.getHttpServer()).get(
      '/api/v1/cards?pageSize=4&sort=number&direction=asc',
    );

    expect(page.status).toBe(200);
    expect(page.body.total).toBe(9);
    expect(page.body.pageCount).toBe(3);
    expect(page.body.items).toHaveLength(4);
    expect(page.body.items.map((item: { number: string }) => item.number)).toEqual([
      '001',
      '003',
      '004',
      '012',
    ]);
    expect(page.body.items[0].set.code).toBe('LUM1');
    expect(page.body.items[0].market.currency).toBe('USD');
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenCalledTimes(1);
    queryRaw.mockRestore();
    findMany.mockRestore();

    const search = await request(app.getHttpServer()).get('/api/v1/cards').query({ name: 'lum' });
    expect(search.body.total).toBe(1);
    expect(search.body.items[0].name).toBe('Lumisprite');

    const combined = await request(app.getHttpServer()).get('/api/v1/cards').query({
      set: 'LUM1',
      rarity: 'Common',
      language: 'fr',
      variant: 'NORMAL',
    });
    expect(combined.body.items.map((item: { name: string }) => item.name)).toEqual(['Lumisprite']);

    const reverse = await request(app.getHttpServer())
      .get('/api/v1/cards')
      .query({ variant: 'REVERSE' });
    expect(reverse.body.items.map((item: { name: string }) => item.name)).toEqual(['Voltige']);

    const empty = await request(app.getHttpServer()).get('/api/v1/cards').query({ language: 'ja' });
    expect(empty.body).toMatchObject({ total: 0, items: [], pageCount: 0 });

    const prices = await request(app.getHttpServer()).get('/api/v1/cards').query({
      sort: 'price',
      direction: 'asc',
      pageSize: 9,
    });
    const amounts = prices.body.items.map((item: { market: { amount: string } | null }) =>
      Number(item.market?.amount),
    );
    const sorted = [...amounts].sort((left, right) => left - right);
    expect(amounts).toEqual(sorted);

    const invalid = await request(app.getHttpServer()).get('/api/v1/cards').query({ sort: 'drop' });
    expect(invalid.status).toBe(400);
  });

  it('returns one card with its variants and rejects an unknown id', async () => {
    const findUnique = jest.spyOn(prisma.card, 'findUnique');
    const listed = await request(app.getHttpServer()).get('/api/v1/cards').query({ name: '186' });
    const id = listed.body.items[0].id as string;

    const detail = await request(app.getHttpServer()).get(`/api/v1/cards/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.name).toBe('Cendragon');
    expect(detail.body.variants).toEqual([
      expect.objectContaining({ code: 'HOLO', currency: 'USD' }),
    ]);
    expect(findUnique).toHaveBeenCalledTimes(1);
    findUnique.mockRestore();

    const missing = await request(app.getHttpServer()).get(
      '/api/v1/cards/00000000-0000-4000-8000-000000000000',
    );
    expect(missing.status).toBe(404);

    const filters = await request(app.getHttpServer()).get('/api/v1/cards/filters');
    expect(filters.status).toBe(200);
    expect(filters.body.sets.map((set: { code: string }) => set.code).sort()).toEqual([
      'BRM1',
      'LUM1',
    ]);
    expect(filters.body.variants.map((variant: { code: string }) => variant.code)).toContain(
      'REVERSE',
    );
    expect(filters.body.languages).toContain('fr');
  });

  it('can use the trigram and rarity indexes when a sequential scan is disabled', async () => {
    const plan = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      const namePlan = await tx.$queryRaw<Array<{ 'QUERY PLAN': unknown }>>`
        EXPLAIN (FORMAT JSON)
        SELECT c.id FROM "Card" c WHERE c.name ILIKE ${'%lum%'}
      `;
      const rarityPlan = await tx.$queryRaw<Array<{ 'QUERY PLAN': unknown }>>`
        EXPLAIN (FORMAT JSON)
        SELECT c.id FROM "Card" c WHERE c.rarity = ${'Common'}
      `;
      return {
        name: JSON.stringify(namePlan),
        rarity: JSON.stringify(rarityPlan),
      };
    });

    expect(plan.name).toContain('Card_name_trgm_idx');
    expect(plan.rarity).toContain('Card_rarity_idx');
  });
});
