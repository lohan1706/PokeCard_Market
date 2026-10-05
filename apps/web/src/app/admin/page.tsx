import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';
import { SESSION_COOKIE } from '@/lib/paths';

export const dynamic = 'force-dynamic';

async function loadSummary(session: string): Promise<{ users: number } | 'forbidden' | 'error'> {
  const api = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  const response = await fetch(`${api}/api/v1/admin/summary`, {
    headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(session)}` },
    cache: 'no-store',
  });
  if (response.status === 403) {
    return 'forbidden';
  }
  if (!response.ok) {
    return 'error';
  }
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('users' in body) || typeof body.users !== 'number') {
    return 'error';
  }
  return { users: body.users };
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/admin');
  }

  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  const summary = session ? await loadSummary(session) : 'error';

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">
        Rôle administrateur
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Administration</h1>
      {summary === 'forbidden' ? (
        <p role="alert" className="mt-4 text-lg text-rose-800">
          Accès refusé
        </p>
      ) : null}
      {summary === 'error' ? (
        <p role="alert" className="mt-4 text-lg text-rose-800">
          Le résumé d’administration est indisponible.
        </p>
      ) : null}
      {summary !== 'forbidden' && summary !== 'error' ? (
        <p className="mt-4 text-lg text-slate-700">{summary.users} comptes</p>
      ) : null}
      <Link href="/dashboard" className="mt-8 text-sm font-medium text-sky-800">
        Retour au tableau de bord
      </Link>
    </main>
  );
}
