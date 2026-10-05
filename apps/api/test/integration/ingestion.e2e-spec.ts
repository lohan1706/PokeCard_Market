import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { hashPassword } from '../../src/auth/password';
import { normalizeDemoPrice } from '../../src/ingestion/normalize/demo.normalizer';
import { CatalogUpsertService } from '../../src/ingestion/upsert/catalog-upsert.service';
import { demoRawPrices } from '../../src/ingestion/fixtures/demo-raw';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('admin ingestion', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = 'Valide1234';
  const adminEmail = 'admin.ingest@ingest.test';
  const userEmail = 'user.ingest@ingest.test';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    await prisma.user.deleteMany({ where: { email: { endsWith: '@ingest.test' } } });
    await prisma.role.upsert({
      where: { code: 'USER' },
      create: { code: 'USER', label: 'Collectionneur' },
      update: {},
    });
    await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', label: 'Administrateur' },
      update: {},
    });
    await createUser(adminEmail, 'ADMIN');
    await createUser(userEmail, 'USER');
  });

  afterAll(async () => {
    await cleanup();
    await prisma.user.deleteMany({ where: { email: { endsWith: '@ingest.test' } } });
    await app.close();
  });

  it('imports a bounded demo batch, keeps price history, and leaves the seed catalog untouched', async () => {
    const seedBefore = await prisma.card.count({ where: { externalId: { startsWith: 'demo:' } } });
    const server = app.getHttpServer();
    const admin = await login(adminEmail);
    const user = await login(userEmail);

    expect(
      (await request(server).post('/api/v1/admin/sync/sets').send({ provider: 'DEMO' })).status,
    ).toBe(401);
    expect(
      (await user.post('/api/v1/admin/sync/cards').send({ provider: 'DEMO', setCode: 'INGEST1' }))
        .status,
    ).toBe(403);
    expect((await user.get('/api/v1/admin/sync/status')).status).toBe(403);
    expect((await admin.post('/api/v1/admin/sync/cards').send({ provider: 'DEMO' })).status).toBe(
      400,
    );
    expect(
      (await admin.post('/api/v1/admin/sync/sets').send({ provider: 'DEMO', extra: true })).status,
    ).toBe(400);

    const fetchSpy = jest.spyOn(global, 'fetch');
    const blocked = await admin
      .post('/api/v1/admin/sync/sets')
      .send({ provider: 'TCGDEX', setCode: 'swsh3' });
    expect(blocked.status).toBe(409);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    const sets = await admin
      .post('/api/v1/admin/sync/sets')
      .send({ provider: 'DEMO', setCode: 'INGEST1', limit: 20 });
    expect(sets.status).toBe(201);
    expect(sets.body).toMatchObject({
      provider: 'DEMO',
      jobType: 'SETS',
      status: 'SUCCEEDED',
      setsSeen: 1,
      errorsCount: 0,
    });

    const cards = await admin
      .post('/api/v1/admin/sync/cards')
      .send({ provider: 'DEMO', setCode: 'INGEST1', limit: 20 });
    expect(cards.status).toBe(201);
    expect(cards.body).toMatchObject({ status: 'SUCCEEDED', cardsSeen: 3, errorsCount: 0 });

    const prices = await admin
      .post('/api/v1/admin/sync/prices')
      .send({ provider: 'DEMO', setCode: 'INGEST1', limit: 20 });
    expect(prices.status).toBe(201);
    expect(prices.body).toMatchObject({
      status: 'SUCCEEDED',
      pricesWritten: 3,
      skipped: 3,
      errorsCount: 3,
    });

    const card = await prisma.card.findUniqueOrThrow({
      where: { externalId: 'DEMO:ingest-card-025' },
      include: {
        translations: { orderBy: { language: 'asc' } },
        printing: true,
        variants: { include: { variant: true } },
        set: true,
      },
    });
    expect(card.set.code).toBe('INGEST1');
    expect(card.number).toBe('025');
    expect(card.translations.map((item) => item.language)).toEqual(['en', 'fr']);
    expect(card.printing?.illustrator).toBe('Artiste Fixture');
    expect(card.variants.map((item) => item.variant.code).sort()).toEqual(['NORMAL', 'REVERSE']);

    const history = await prisma.priceHistory.findMany({
      where: { cardVariant: { cardId: card.id } },
      orderBy: [{ currency: 'asc' }, { capturedOn: 'asc' }],
    });
    expect(history.map((row) => quote(row))).toEqual([
      'EUR:UNSPECIFIED:2024-10-02:2.25',
      'USD:NM:2024-10-01:1.50',
      'USD:NM:2024-10-02:1.80',
    ]);

    const again = await admin
      .post('/api/v1/admin/sync/prices')
      .send({ provider: 'DEMO', setCode: 'INGEST1', limit: 20 });
    expect(again.status).toBe(201);
    const historyAfter = await prisma.priceHistory.count({
      where: { cardVariant: { cardId: card.id } },
    });
    expect(historyAfter).toBe(history.length);
    const firstDay = await prisma.priceHistory.findFirstOrThrow({
      where: {
        cardVariant: { cardId: card.id },
        currency: 'USD',
        conditionCode: 'NM',
        capturedOn: new Date('2024-10-01T00:00:00.000Z'),
      },
    });
    expect(firstDay.market.toString()).toBe(history[1]?.market.toString());
    expect(firstDay.isCorrected).toBe(false);

    const corrected = normalizeDemoPrice(demoRawPrices[1]);
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    const upsert = app.get(CatalogUpsertService);
    const provider = await prisma.priceProvider.findUniqueOrThrow({ where: { code: 'DEMO' } });
    await upsert.importPrices(
      { runId: again.body.id as string, providerDbId: provider.id, providerCode: 'DEMO' },
      [
        { raw: { adjusted: true }, value: { ...corrected.value, market: '1.99' } },
        {
          raw: { adjusted: true },
          value: {
            ...corrected.value,
            externalId: 'price-025-nm-3',
            market: '2.10',
            capturedOn: '2024-10-03',
          },
        },
      ],
      [],
    );
    const days = await prisma.priceHistory.findMany({
      where: { cardVariant: { cardId: card.id }, currency: 'USD', conditionCode: 'NM' },
      orderBy: { capturedOn: 'asc' },
    });
    expect(
      days.map((row) => [
        row.capturedOn.toISOString().slice(0, 10),
        canonicalMoney(row.market.toString()),
        row.isCorrected,
      ]),
    ).toEqual([
      ['2024-10-01', '1.50', false],
      ['2024-10-02', '1.99', true],
      ['2024-10-03', '2.10', false],
    ]);

    const set = await prisma.set.findUniqueOrThrow({ where: { code: 'INGEST1' } });
    await prisma.card.create({
      data: {
        setId: set.id,
        number: '25',
        name: 'Doublon Fixture',
        externalId: 'manual:ingest:25',
        subtypes: [],
      },
    });
    const conflicted = await admin
      .post('/api/v1/admin/sync/cards')
      .send({ provider: 'DEMO', setCode: 'INGEST1', limit: 20 });
    expect(conflicted.body.skipped).toBe(1);
    const report = await admin
      .get('/api/v1/admin/sync/errors')
      .query({ runId: conflicted.body.id });
    expect(report.status).toBe(200);
    expect(report.body.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'card_identity_mismatch',
          externalId: 'ingest-card-025',
        }),
      ]),
    );
    const unchanged = await prisma.card.findUniqueOrThrow({
      where: { externalId: 'DEMO:ingest-card-025' },
    });
    expect(unchanged.name).toBe('Pikachu Fixture');
    expect(
      await prisma.card.findUnique({ where: { externalId: 'manual:ingest:25' } }),
    ).not.toBeNull();

    const providerRow = await prisma.priceProvider.findUniqueOrThrow({ where: { code: 'DEMO' } });
    await prisma.priceProvider.update({ where: { id: providerRow.id }, data: { isActive: false } });
    expect(
      (await admin.post('/api/v1/admin/sync/sets').send({ provider: 'DEMO', setCode: 'INGEST1' }))
        .status,
    ).toBe(409);
    await prisma.priceProvider.update({ where: { id: providerRow.id }, data: { isActive: true } });

    const catalog = await request(server).get('/api/v1/cards').query({ name: 'Lumisprite' });
    expect(catalog.status).toBe(200);
    expect(catalog.body.items[0].name).toBe('Lumisprite');
    expect(await prisma.card.count({ where: { externalId: { startsWith: 'demo:' } } })).toBe(
      seedBefore,
    );
  });

  async function createUser(email: string, role: 'ADMIN' | 'USER'): Promise<void> {
    const roleRow = await prisma.role.findUniqueOrThrow({ where: { code: role } });
    await prisma.user.create({
      data: {
        email,
        displayName: role,
        passwordHash: await hashPassword(password),
        roleId: roleRow.id,
      },
    });
  }

  async function login(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent.post('/api/v1/auth/login').send({ email, password });
    expect(response.status).toBe(200);
    return agent;
  }

  async function cleanup(): Promise<void> {
    const set = await prisma.set.findUnique({ where: { code: 'INGEST1' }, select: { id: true } });
    if (set) {
      const cards = await prisma.card.findMany({ where: { setId: set.id }, select: { id: true } });
      const cardIds = cards.map((card) => card.id);
      if (cardIds.length > 0) {
        await prisma.priceHistory.deleteMany({
          where: { cardVariant: { cardId: { in: cardIds } } },
        });
        await prisma.price.deleteMany({ where: { cardVariant: { cardId: { in: cardIds } } } });
        await prisma.cardVariant.deleteMany({ where: { cardId: { in: cardIds } } });
        await prisma.externalIdentity.deleteMany({
          where: { entityType: 'CARD', entityId: { in: cardIds } },
        });
      }
      await prisma.externalIdentity.deleteMany({ where: { entityType: 'SET', entityId: set.id } });
      await prisma.card.deleteMany({ where: { setId: set.id } });
      await prisma.set.delete({ where: { id: set.id } });
    }
    const provider = await prisma.priceProvider.findUnique({
      where: { code: 'DEMO' },
      select: { id: true },
    });
    if (provider) {
      await prisma.externalIdentity.deleteMany({ where: { providerId: provider.id } });
      await prisma.importRecord.deleteMany({ where: { providerId: provider.id } });
      await prisma.conditionMap.deleteMany({ where: { providerId: provider.id } });
      await prisma.ingestionRun.deleteMany({ where: { providerId: provider.id } });
      await prisma.priceProvider.delete({ where: { id: provider.id } });
    }
  }
});

function canonicalMoney(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${(fraction + '00').slice(0, 2)}`;
}

function quote(row: {
  currency: string;
  conditionCode: string;
  capturedOn: Date;
  market: { toString(): string };
}): string {
  return `${row.currency.trim()}:${row.conditionCode}:${row.capturedOn.toISOString().slice(0, 10)}:${canonicalMoney(row.market.toString())}`;
}
