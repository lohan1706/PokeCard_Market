import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { parseEnv } from '../config/env.schema';
import { attachSessionCookie, clearSessionCookie, isSecureCookie } from './cookies';

@Injectable()
export class AuthCookieWriter {
  private readonly secure = isSecureCookie(parseEnv(process.env).WEB_ORIGIN);

  attach(response: Response, token: string): void {
    attachSessionCookie(response, token, this.secure);
  }

  clear(response: Response): void {
    clearSessionCookie(response, this.secure);
  }
}
