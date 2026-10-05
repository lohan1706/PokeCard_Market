import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ACCESS_DENIED, AUTH_REQUIRED, SESSION_COOKIE_NAME } from '../../src/auth/auth.constants';
import { AuthGuard } from '../../src/auth/auth.guard';
import { AuthService } from '../../src/auth/auth.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';
import { IS_PUBLIC_KEY } from '../../src/auth/public.decorator';
import { RolesGuard } from '../../src/auth/roles.guard';
import { ROLES_KEY } from '../../src/auth/roles.decorator';

const user: AuthenticatedUser = {
  id: 'user-1',
  email: 'lea@auth.test',
  displayName: 'Léa',
  role: 'USER',
};

function httpContext(request: Request, metadata: { isPublic?: boolean; roles?: string[] }) {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return metadata.isPublic ?? false;
      }
      if (key === ROLES_KEY) {
        return metadata.roles;
      }
      return undefined;
    },
  };
  return {
    reflector,
    context: {
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  };
}

describe('AuthGuard', () => {
  it('allows a public route and attaches a valid user', async () => {
    const request = { headers: { cookie: `${SESSION_COOKIE_NAME}=token` } } as Request;
    const { reflector, context } = httpContext(request, { isPublic: true });
    const authService = {
      authenticate: async () => user,
    };
    const guard = new AuthGuard(
      reflector as unknown as Reflector,
      authService as unknown as AuthService,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.currentUser).toEqual(user);
  });

  it('rejects a protected route without a session', async () => {
    const request = { headers: {} } as Request;
    const { reflector, context } = httpContext(request, {});
    const authService = { authenticate: async () => null };
    const guard = new AuthGuard(
      reflector as unknown as Reflector,
      authService as unknown as AuthService,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow(AUTH_REQUIRED);
  });
});

describe('RolesGuard', () => {
  it('lets a collector open the dashboard and blocks administration', () => {
    const request = { currentUser: user } as Request;
    const dashboard = httpContext(request, { roles: ['USER', 'ADMIN'] });
    const admin = httpContext(request, { roles: ['ADMIN'] });
    const dashboardGuard = new RolesGuard(dashboard.reflector as unknown as Reflector);
    const adminGuard = new RolesGuard(admin.reflector as unknown as Reflector);

    expect(dashboardGuard.canActivate(dashboard.context)).toBe(true);
    expect(() => adminGuard.canActivate(admin.context)).toThrow(ForbiddenException);
    expect(() => adminGuard.canActivate(admin.context)).toThrow(ACCESS_DENIED);
  });

  it('does not apply role checks to public routes', () => {
    const request = {} as Request;
    const { reflector, context } = httpContext(request, { isPublic: true, roles: ['ADMIN'] });
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(context)).toBe(true);
  });
});
