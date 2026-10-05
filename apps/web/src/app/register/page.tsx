import Link from 'next/link';
import { RegisterForm } from '@/components/register-form';

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">Compte</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Inscription</h1>
      <p className="mt-3 text-slate-600">Le compte créé a le rôle collectionneur.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-slate-600">
        Déjà inscrit ?{' '}
        <Link href="/login" className="font-medium text-sky-800">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
