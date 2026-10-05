import { CardDetail } from '@/components/card-detail';

export const dynamic = 'force-dynamic';

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <p className="text-sm font-medium tracking-wide text-sky-700 uppercase">Carte</p>
      <CardDetail id={id} />
    </main>
  );
}
