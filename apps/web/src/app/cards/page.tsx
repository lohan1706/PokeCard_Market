import { CatalogBrowser } from '@/components/catalog-browser';
import { catalogQueryFromParams } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = catalogQueryFromParams(await searchParams);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">Catalogue</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Cartes</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Le jeu de démonstration reste visible à côté des cartes importées. Un prix ou une image
        n’apparaît que s’il a été enregistré. Les images distantes restent hébergées par leur
        source.
      </p>
      <CatalogBrowser query={query} />
    </main>
  );
}
