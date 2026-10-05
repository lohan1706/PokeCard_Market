import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import './express-augmentation';
import { AUTH_REQUIRED, SESSION_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { readCookie } from './cookies';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    const token = readCookie(request.headers.cookie, SESSION_COOKIE_NAME);
    const user = await this.authService.authenticate(token);
    if (user) {
      request.currentUser = user;
    }
    if (isPublic) {
      return true;
    }
    if (!user) {
      throw new UnauthorizedException(AUTH_REQUIRED);
    }
    return true;
  }
}
