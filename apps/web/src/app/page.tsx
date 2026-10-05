import Link from 'next/link';
import { buildApiUrl } from '@/lib/api';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">PokéCard Market</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">PokéCard Market</h1>
      <p className="mt-4 text-lg text-slate-600">
        Recherchez, suivez et estimez une collection de cartes. L’inscription et la connexion
        ouvrent le tableau de bord.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
        >
          Inscription
        </Link>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Santé de l’API : <code className="text-slate-800">{buildApiUrl('/health')}</code>
      </p>
    </main>
  );
}
