import type { InternalCondition } from './conditions';
import type { InternalLanguage } from './languages';
import type { InternalVariant } from './variants';

export type NormalizedAttack = {
  name: string;
  cost: string[];
  damage: string | null;
  effect: string | null;
};

export type NormalizedSetTranslation = {
  language: InternalLanguage;
  name: string;
  series: string | null;
  logoUrl: string | null;
  symbolUrl: string | null;
  sourceExternalId: string;
};

export type NormalizedSet = {
  externalId: string;
  code: string;
  language: InternalLanguage;
  name: string;
  series: string | null;
  region: string | null;
  releaseDate: string | null;
  logoUrl: string | null;
  symbolUrl: string | null;
  cardCount: number | null;
  translations: NormalizedSetTranslation[];
};

export type NormalizedCardTranslation = {
  language: InternalLanguage;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageLargeUrl: string | null;
  thumbnailUrl: string | null;
  sourceExternalId: string;
  localisedData: Record<string, unknown>;
};

export type NormalizedCard = {
  externalId: string;
  setExternalId: string;
  setCode: string;
  number: string;
  normalizedNumber: string;
  language: InternalLanguage;
  name: string;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[];
  hp: number | null;
  types: string[];
  evolveFrom: string | null;
  level: string | null;
  illustrator: string | null;
  weakness: string | null;
  resistance: string | null;
  retreatCost: number | null;
  regulationMark: string | null;
  description: string | null;
  attacks: NormalizedAttack[];
  rules: string[];
  imageUrl: string | null;
  imageLargeUrl: string | null;
  thumbnailUrl: string | null;
  variants: InternalVariant[];
  translations: NormalizedCardTranslation[];
};

export type NormalizedPrice = {
  externalId: string;
  cardExternalId: string;
  setCode: string;
  number: string;
  normalizedNumber: string;
  variant: InternalVariant;
  language: InternalLanguage;
  condition: InternalCondition;
  currency: string;
  market: string;
  low: string | null;
  mid: string | null;
  high: string | null;
  capturedOn: string;
  sourceUrl: string | null;
};

export type NormalizeResult<T> =
  { ok: true; value: T } | { ok: false; externalId: string | null; issues: string[] };
