import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">Espace personnel</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Tableau de bord</h1>
      <p className="mt-4 text-lg text-slate-700">{user.displayName}</p>
      <p className="text-slate-600">{user.email}</p>
      <p className="mt-2 text-sm text-slate-500">
        Rôle : {user.role === 'ADMIN' ? 'Administrateur' : 'Collectionneur'}
      </p>
      <div className="mt-8 flex items-center gap-3">
        {user.role === 'ADMIN' ? (
          <Link
            href="/admin"
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Administration
          </Link>
        ) : null}
        <LogoutButton />
      </div>
    </main>
  );
}
