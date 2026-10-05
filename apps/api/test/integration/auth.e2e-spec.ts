import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { hashPassword as hashScryptPassword } from '../../prisma/password';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { EMAIL_TAKEN, INVALID_CREDENTIALS } from '../../src/auth/auth.constants';
import { hashPassword } from '../../src/auth/password';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('authentication', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = 'Valide1234';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.role.upsert({
      where: { code: 'USER' },
      create: { code: 'USER', label: 'Collectionneur' },
      update: { label: 'Collectionneur' },
    });
    await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', label: 'Administrateur' },
      update: { label: 'Administrateur' },
    });
    await prisma.user.deleteMany({ where: { email: { endsWith: '@auth.test' } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@auth.test' } } });
    await app.close();
  });

  it('registers, logs in, reads the profile, enforces roles, and logs out', async () => {
    const email = `collector.${Date.now()}@auth.test`;
    const server = app.getHttpServer();

    const anonymous = await request(server).get('/api/v1/dashboard');
    expect(anonymous.status).toBe(401);

    const invalid = await request(server).post('/api/v1/auth/register').send({
      email,
      password: 'court',
      displayName: 'A',
    });
    expect(invalid.status).toBe(400);
    expect(JSON.stringify(invalid.body)).not.toContain('court');

    const created = await request(server).post('/api/v1/auth/register').send({
      email,
      password,
      displayName: '  Camille Test  ',
    });
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({
      email,
      displayName: 'Camille Test',
      role: 'USER',
    });
    expect(created.body.user.passwordHash).toBeUndefined();
    expect(created.headers['set-cookie']).toBeUndefined();

    const duplicate = await request(server)
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password, displayName: 'Autre Nom' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe(EMAIL_TAKEN);

    const agent = request.agent(server);
    const wrong = await agent.post('/api/v1/auth/login').send({ email, password: 'Mauvais123' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.message).toBe(INVALID_CREDENTIALS);
    expect(JSON.stringify(wrong.body)).not.toContain('Mauvais123');

    const unknown = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'inconnu@auth.test', password });
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(INVALID_CREDENTIALS);

    const login = await agent.post('/api/v1/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const setCookie = login.headers['set-cookie'];
    const cookieHeader = (Array.isArray(setCookie) ? setCookie : [setCookie]).join(';');
    expect(cookieHeader.toLowerCase()).toContain('httponly');
    expect(cookieHeader).toContain('pcm_session=');
    expect(JSON.stringify(login.body)).not.toContain(password);

    const token = /pcm_session=([^;]+)/.exec(cookieHeader)?.[1];
    const stored = await prisma.session.findFirst({
      where: { userId: login.body.user.id as string },
    });
    expect(token).toBeDefined();
    expect(stored?.tokenHash).toHaveLength(64);
    expect(stored?.tokenHash).not.toBe(token);

    expect((await agent.get('/api/v1/auth/me')).body.email).toBe(email);
    expect((await agent.get('/api/v1/dashboard')).status).toBe(200);
    expect((await agent.get('/api/v1/admin/summary')).status).toBe(403);

    const extra = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password, extra: true });
    expect(extra.status).toBe(400);

    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
    expect((await request(server).post('/api/v1/auth/logout')).status).toBe(204);
  });

  it('upgrades a legacy scrypt password to argon2id', async () => {
    const email = `legacy.${Date.now()}@auth.test`;
    const legacyPassword = 'DemoCollector!2026';
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'USER' } });
    await prisma.user.create({
      data: {
        email,
        displayName: 'Legacy',
        passwordHash: hashScryptPassword(legacyPassword, 'auth-test-salt'),
        roleId: role.id,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: legacyPassword });

    expect(response.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(saved.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('hides disabled accounts behind the same login error', async () => {
    const email = `disabled.${Date.now()}@auth.test`;
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'USER' } });
    await prisma.user.create({
      data: {
        email,
        displayName: 'Inactif',
        passwordHash: await hashPassword(password),
        roleId: role.id,
        disabledAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(INVALID_CREDENTIALS);
  });

  it('lets an administrator read the summary and rejects an expired session', async () => {
    const email = `admin.${Date.now()}@auth.test`;
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
    await prisma.user.create({
      data: {
        email,
        displayName: 'Admin Test',
        passwordHash: await hashPassword(password),
        roleId: role.id,
      },
    });
    const agent = request.agent(app.getHttpServer());
    const login = await agent.post('/api/v1/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('ADMIN');

    const summary = await agent.get('/api/v1/admin/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.users).toEqual(expect.any(Number));

    await prisma.session.updateMany({
      where: { userId: login.body.user.id as string },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    expect((await agent.get('/api/v1/admin/summary')).status).toBe(401);
  });
});
