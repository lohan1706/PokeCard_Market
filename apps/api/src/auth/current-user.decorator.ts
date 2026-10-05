import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_REQUIRED } from './auth.constants';
import type { AuthenticatedUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.currentUser) {
      throw new UnauthorizedException(AUTH_REQUIRED);
    }
    return request.currentUser;
  },
);
