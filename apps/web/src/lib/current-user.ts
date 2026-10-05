import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './paths';

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
};

function isCurrentUser(value: unknown): value is CurrentUser {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.email === 'string' &&
    typeof record.displayName === 'string' &&
    (record.role === 'USER' || record.role === 'ADMIN')
  );
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) {
    return null;
  }

  const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  const response = await fetch(`${api}/api/v1/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(session)}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }
  const body: unknown = await response.json();
  return isCurrentUser(body) ? body : null;
}
