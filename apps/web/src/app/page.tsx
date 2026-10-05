import { buildApiUrl } from '@/lib/api';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">Infrastructure</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">PokéCard Market</h1>
      <p className="mt-4 text-lg text-slate-600">
        Le socle Next.js, NestJS, PostgreSQL et Prisma est en place. Les fonctionnalités métier ne
        sont pas encore développées.
      </p>
      <p className="mt-6 text-sm text-slate-500">
        Santé de l’API : <code className="text-slate-800">{buildApiUrl('/health')}</code>
      </p>
    </main>
  );
}
