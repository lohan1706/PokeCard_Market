import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_DENIED,
  EMAIL_TAKEN,
  INVALID_CREDENTIALS,
  SESSION_TTL_MS,
  type RoleCode,
} from './auth.constants';
import type { AuthenticatedUser, RequestContext } from './auth.types';
import type { RegisterDto } from './dto/register.dto';
import { hashPassword, needsRehash, verifyPassword } from './password';
import { createSessionToken, hashSessionToken } from './session-token';

type UserWithRole = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  disabledAt: Date | null;
  role: { code: string };
};

@Injectable()
export class AuthService {
  private dummyHash: Promise<string> | undefined;

  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterDto): Promise<AuthenticatedUser> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const role = await this.prisma.role.findUnique({ where: { code: 'USER' } });
    if (!role) {
      throw new InternalServerErrorException('Configuration des rôles incomplète');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(EMAIL_TAKEN);
    }

    const passwordHash = await hashPassword(input.password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            displayName,
            passwordHash,
            roleId: role.id,
          },
          include: { role: true },
        });
        await tx.collection.create({
          data: { userId: created.id, name: 'Ma collection' },
        });
        await tx.auditLog.create({
          data: {
            actorId: created.id,
            action: 'USER_REGISTERED',
            entityType: 'User',
            entityId: created.id,
            metadata: {},
          },
        });
        return created;
      });
      return this.toPublicUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(EMAIL_TAKEN);
      }
      throw error;
    }
  }

  async login(
    email: string,
    password: string,
    context: RequestContext,
  ): Promise<{ token: string; user: AuthenticatedUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { role: true },
    });

    const storedHash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await verifyPassword(password, storedHash);
    if (!user || user.disabledAt || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (needsRehash(user.passwordHash)) {
      const passwordHash = await hashPassword(password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }

    const token = createSessionToken();
    const publicUser = this.toPublicUser(user);
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        userAgent: context.userAgent,
        ip: context.ip,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        metadata: {},
      },
    });

    return { token, user: publicUser };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.session.findUnique({ where: { tokenHash } });
    if (!session || session.revokedAt) {
      return;
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: session.userId,
        metadata: {},
      },
    });
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedUser | null> {
    if (!token) {
      return null;
    }
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { include: { role: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    if (session.user.disabledAt) {
      return null;
    }
    return this.toPublicUser(session.user);
  }

  private async getDummyHash(): Promise<string> {
    this.dummyHash ??= hashPassword('dummy-password-not-used');
    return this.dummyHash;
  }

  private toPublicUser(user: UserWithRole): AuthenticatedUser {
    if (!this.isRole(user.role.code)) {
      throw new UnauthorizedException(ACCESS_DENIED);
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role.code,
    };
  }

  private isRole(code: string): code is RoleCode {
    return code === 'USER' || code === 'ADMIN';
  }
}
