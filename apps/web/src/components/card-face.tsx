import Link from 'next/link';
import { formatMarket, type CatalogCard } from '@/lib/catalog';

const RARITY_STYLES: Record<string, string> = {
  Common: 'from-slate-200 to-slate-400',
  Uncommon: 'from-emerald-200 to-emerald-500',
  Rare: 'from-sky-200 to-sky-500',
  'Rare Holo': 'from-amber-200 to-amber-500',
  'Ultra Rare': 'from-violet-200 to-violet-500',
  'Secret Rare': 'from-rose-200 to-rose-500',
};

export function CardFace({ card, linked = true }: { card: CatalogCard; linked?: boolean }) {
  const gradient = RARITY_STYLES[card.rarity ?? ''] ?? 'from-slate-200 to-sky-400';
  const body = (
    <>
      <div className={`relative h-36 bg-gradient-to-br ${gradient}`}>
        <span className="absolute top-3 left-3 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-slate-800">
          {card.number}
        </span>
        <span className="absolute right-3 bottom-3 text-3xl font-semibold tracking-tight text-white/90">
          {card.hp ?? '—'}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {linked ? (
          <h2 className="text-lg font-semibold tracking-tight group-hover:text-sky-800">
            {card.name}
          </h2>
        ) : (
          <p className="text-lg font-semibold tracking-tight">{card.name}</p>
        )}
        <p className="text-sm text-slate-600">
          {card.rarity ?? 'Rareté inconnue'} · {card.set.name}
        </p>
        <p className="text-xs tracking-wide text-slate-500 uppercase">{card.set.language}</p>
        <ul className="flex flex-wrap gap-1">
          {card.variants.map((variant) => (
            <li
              key={variant.code}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              {variant.name}
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-3 text-sm font-medium text-slate-900">
          {formatMarket(card.market)}
        </p>
      </div>
    </>
  );
  const className =
    'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';
  if (!linked) {
    return <article className={className}>{body}</article>;
  }
  return (
    <Link href={`/cards/${card.id}`} className={className}>
      {body}
    </Link>
  );
}
