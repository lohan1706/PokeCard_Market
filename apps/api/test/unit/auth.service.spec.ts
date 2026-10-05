import { UnauthorizedException } from '@nestjs/common';
import { INVALID_CREDENTIALS } from '../../src/auth/auth.constants';
import { AuthService } from '../../src/auth/auth.service';
import { hashPassword } from '../../src/auth/password';
import { hashSessionToken } from '../../src/auth/session-token';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('AuthService.login', () => {
  it('rejects an unknown account and a wrong password with the same message', async () => {
    const passwordHash = await hashPassword('Valide1234');
    const service = new AuthService(
      fakePrisma({
        id: 'user-1',
        email: 'lea@auth.test',
        displayName: 'Léa',
        passwordHash,
        disabledAt: null,
        role: { code: 'USER' },
      }) as unknown as PrismaService,
    );

    const unknown = new AuthService(fakePrisma(null) as unknown as PrismaService);

    await expect(service.login('lea@auth.test', 'Mauvais123', {})).rejects.toThrow(
      new UnauthorizedException(INVALID_CREDENTIALS),
    );
    await expect(unknown.login('absent@auth.test', 'Mauvais123', {})).rejects.toThrow(
      INVALID_CREDENTIALS,
    );
  });

  it('returns a raw token that is not the stored hash', async () => {
    const passwordHash = await hashPassword('Valide1234');
    const created: Array<{ tokenHash: string }> = [];
    const prisma = fakePrisma({
      id: 'user-1',
      email: 'lea@auth.test',
      displayName: 'Léa',
      passwordHash,
      disabledAt: null,
      role: { code: 'USER' },
    });
    prisma.session.create = async ({ data }: { data: { tokenHash: string } }) => {
      created.push(data);
      return data;
    };
    const service = new AuthService(prisma as unknown as PrismaService);

    const result = await service.login('lea@auth.test', 'Valide1234', {});

    expect(result.user).toEqual({
      id: 'user-1',
      email: 'lea@auth.test',
      displayName: 'Léa',
      role: 'USER',
    });
    expect(result.token).not.toBe(created[0]?.tokenHash);
    expect(created[0]?.tokenHash).toBe(hashSessionToken(result.token));
    expect(JSON.stringify(result)).not.toContain('Valide1234');
    expect(JSON.stringify(result)).not.toContain(passwordHash);
  });
});

function fakePrisma(
  user: {
    id: string;
    email: string;
    displayName: string;
    passwordHash: string;
    disabledAt: Date | null;
    role: { code: string };
  } | null,
) {
  return {
    user: {
      findUnique: async () => user,
      update: async () => user,
    },
    session: {
      create: async ({ data }: { data: { tokenHash: string } }) => data,
    },
    auditLog: {
      create: async () => ({}),
    },
  };
}
