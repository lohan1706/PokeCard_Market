import type { CookieOptions, Response } from 'express';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './auth.constants';

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) {
    return undefined;
  }
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    if (key !== name) {
      continue;
    }
    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function isSecureCookie(webOrigin: string): boolean {
  return webOrigin.startsWith('https://');
}

export function sessionCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function attachSessionCookie(response: Response, token: string, secure: boolean): void {
  response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(secure));
}

export function clearSessionCookie(response: Response, secure: boolean): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });
}
