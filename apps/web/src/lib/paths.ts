export const SESSION_COOKIE = 'pcm_session';

const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register';
}

export function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/dashboard';
  }
  if (value.startsWith('/login') || value.startsWith('/register')) {
    return '/dashboard';
  }
  return value;
}
