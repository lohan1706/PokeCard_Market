'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/lib/api';
import { formatMarket, isCatalogCard, type CatalogCard } from '@/lib/catalog';
import { CardFace } from './card-face';

export function CardDetail({ id }: { id: string }) {
  const [snapshot, setSnapshot] = useState<{
    id: string;
    status: 'loading' | 'error' | 'missing' | 'ready';
    card: CatalogCard | null;
  }>({ id, status: 'loading', card: null });

  if (snapshot.id !== id) {
    setSnapshot({ id, status: 'loading', card: null });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(buildApiUrl(`/cards/${id}`), { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 404) {
          setSnapshot({ id, status: 'missing', card: null });
          return;
        }
        if (!response.ok) {
          throw new Error('card request failed');
        }
        const body: unknown = await response.json();
        if (!isCatalogCard(body)) {
          throw new Error('card payload invalid');
        }
        setSnapshot({ id, status: 'ready', card: body });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setSnapshot({ id, status: 'error', card: null });
      });
    return () => controller.abort();
  }, [id]);

  return (
    <div className="mt-8">
      <Link href="/cards" className="text-sm font-medium text-sky-800">
        Retour au catalogue
      </Link>
      {snapshot.status === 'loading' ? (
        <p role="status" className="mt-8 text-slate-600">
          Chargement de la carte
        </p>
      ) : null}
      {snapshot.status === 'error' ? (
        <p role="alert" className="mt-8 text-rose-800">
          Le détail de la carte est indisponible.
        </p>
      ) : null}
      {snapshot.status === 'missing' ? (
        <p role="status" className="mt-8 text-slate-600">
          Cette carte est introuvable.
        </p>
      ) : null}
      {snapshot.status === 'ready' && snapshot.card ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <CardFace card={snapshot.card} linked={false} />
          <section>
            <h1 className="text-4xl font-semibold tracking-tight">{snapshot.card.name}</h1>
            <p className="mt-3 text-lg text-slate-600">
              {snapshot.card.set.name} · n° {snapshot.card.number} ·{' '}
              {snapshot.card.rarity ?? 'Rareté inconnue'}
            </p>
            <p className="mt-2 text-slate-600">
              {snapshot.card.supertype ?? 'Carte'}
              {snapshot.card.subtypes.length > 0 ? ` · ${snapshot.card.subtypes.join(', ')}` : ''} ·
              langue {snapshot.card.set.language}
            </p>
            <p className="mt-6 text-sm font-medium tracking-wide text-slate-500 uppercase">
              Variantes
            </p>
            {snapshot.card.variants.length === 0 ? (
              <p className="mt-3 text-slate-600">Variante indisponible</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">
                {snapshot.card.variants.map((variant) => (
                  <li key={variant.code} className="flex items-center justify-between px-4 py-3">
                    <span>{variant.name}</span>
                    <span className="text-right font-medium">
                      {variant.market && variant.currency
                        ? formatMarket({ amount: variant.market, currency: variant.currency })
                        : 'Prix indisponible'}
                      {variant.capturedOn ? (
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          Relevé du {variant.capturedOn}
                          {variant.source ? ` · ${variant.source}` : ''}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
