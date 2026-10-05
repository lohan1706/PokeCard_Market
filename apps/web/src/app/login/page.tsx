import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import { safeNextPath } from '@/lib/paths';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">Compte</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Connexion</h1>
      <LoginForm registered={params.registered === '1'} nextPath={safeNextPath(params.next)} />
      <p className="mt-6 text-sm text-slate-600">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-sky-800">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
