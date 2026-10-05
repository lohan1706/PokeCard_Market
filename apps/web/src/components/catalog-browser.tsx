'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/lib/api';
import {
  catalogApiPath,
  catalogHref,
  catalogView,
  isCatalogFilters,
  isCatalogPage,
  type CatalogFilters,
  type CatalogPage,
  type CatalogQuery,
} from '@/lib/catalog';
import { CardFace } from './card-face';

const SORTS = [
  { value: 'name', label: 'Nom' },
  { value: 'number', label: 'Numéro' },
  { value: 'rarity', label: 'Rareté' },
  { value: 'release', label: 'Date de sortie' },
  { value: 'price', label: 'Prix' },
];

export function CatalogBrowser({ query }: { query: CatalogQuery }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${catalogApiPath(query)}#${attempt}`;
  const [snapshot, setSnapshot] = useState<{
    key: string;
    status: 'loading' | 'error' | 'ready';
    page: CatalogPage | null;
    filters: CatalogFilters | null;
  }>({ key: requestKey, status: 'loading', page: null, filters: null });

  if (snapshot.key !== requestKey) {
    setSnapshot({ key: requestKey, status: 'loading', page: null, filters: null });
  }

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(buildApiUrl(catalogApiPath(query)), { signal: controller.signal, cache: 'no-store' }),
      fetch(buildApiUrl('/cards/filters'), { signal: controller.signal, cache: 'no-store' }),
    ])
      .then(async ([cardsResponse, filtersResponse]) => {
        if (!cardsResponse.ok || !filtersResponse.ok) {
          throw new Error('catalog request failed');
        }
        const cardsBody: unknown = await cardsResponse.json();
        const filtersBody: unknown = await filtersResponse.json();
        if (!isCatalogPage(cardsBody) || !isCatalogFilters(filtersBody)) {
          throw new Error('catalog payload invalid');
        }
        setSnapshot({
          key: requestKey,
          status: 'ready',
          page: cardsBody,
          filters: filtersBody,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setSnapshot({ key: requestKey, status: 'error', page: null, filters: null });
      });
    return () => controller.abort();
  }, [query, attempt, requestKey]);

  function replace(next: CatalogQuery) {
    router.replace(catalogHref(next));
  }

  function changeFilter(patch: Partial<CatalogQuery>) {
    replace({ ...query, ...patch, page: 1 });
  }

  const view = catalogView({ status: snapshot.status, count: snapshot.page?.items.length ?? 0 });
  const page = snapshot.page;
  const filters = snapshot.filters;

  return (
    <div className="mt-8">
      <form
        className="grid gap-3 md:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          changeFilter({ name: String(form.get('name') ?? '') });
        }}
      >
        <div className="md:col-span-2">
          <label htmlFor="catalog-name" className="text-sm font-medium text-slate-700">
            Nom
          </label>
          <input
            id="catalog-name"
            name="name"
            key={query.name}
            defaultValue={query.name}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Lumisprite, 186…"
          />
        </div>
        <Select
          label="Extension"
          value={query.set}
          onChange={(set) => changeFilter({ set })}
          options={(filters?.sets ?? []).map((set) => ({ value: set.code, label: set.name }))}
        />
        <Select
          label="Rareté"
          value={query.rarity}
          onChange={(rarity) => changeFilter({ rarity })}
          options={(filters?.rarities ?? []).map((rarity) => ({ value: rarity, label: rarity }))}
        />
        <Select
          label="Langue"
          value={query.language}
          onChange={(language) => changeFilter({ language })}
          options={(filters?.languages ?? []).map((language) => ({
            value: language,
            label: language,
          }))}
        />
        <Select
          label="Variante"
          value={query.variant}
          onChange={(variant) => changeFilter({ variant })}
          options={(filters?.variants ?? []).map((variant) => ({
            value: variant.code,
            label: variant.name,
          }))}
        />
        <div>
          <label htmlFor="catalog-sort" className="text-sm font-medium text-slate-700">
            Tri
          </label>
          <select
            id="catalog-sort"
            value={query.sort}
            onChange={(event) => changeFilter({ sort: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="catalog-direction" className="text-sm font-medium text-slate-700">
            Sens
          </label>
          <select
            id="catalog-direction"
            value={query.direction}
            onChange={(event) => changeFilter({ direction: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="asc">Croissant</option>
            <option value="desc">Décroissant</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800"
          >
            Rechercher
          </button>
        </div>
      </form>

      {view === 'loading' ? (
        <p role="status" className="mt-10 text-slate-600">
          Chargement du catalogue
        </p>
      ) : null}
      {view === 'error' ? (
        <div role="alert" className="mt-10 rounded-md bg-rose-50 px-4 py-3 text-rose-800">
          <p>Le catalogue est indisponible.</p>
          <button
            type="button"
            className="mt-3 rounded-md border border-rose-200 px-3 py-1 text-sm"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Réessayer
          </button>
        </div>
      ) : null}
      {view === 'empty' ? (
        <p role="status" className="mt-10 text-slate-600">
          Aucune carte ne correspond à cette recherche.
        </p>
      ) : null}
      {view === 'success' && page ? (
        <>
          <p className="mt-6 text-sm text-slate-500">
            {page.total} {page.total > 1 ? 'cartes' : 'carte'}
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {page.items.map((card) => (
              <li key={card.id}>
                <CardFace card={card} />
              </li>
            ))}
          </ul>
          {page.pageCount > 1 ? (
            <nav className="mt-8 flex items-center gap-3" aria-label="Pagination">
              <button
                type="button"
                disabled={page.page <= 1}
                onClick={() => replace({ ...query, page: page.page - 1 })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-sm text-slate-600">
                Page {page.page} sur {page.pageCount}
              </span>
              <button
                type="button"
                disabled={page.page >= page.pageCount}
                onClick={() => replace({ ...query, page: page.page + 1 })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Suivant
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const id = `catalog-filter-${label}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
      >
        <option value="">Toutes</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
