import { TCGDEX_LANGUAGE_PATHS, type InternalLanguage } from '../domain/languages';
import { moneyFromJson } from '../domain/money';
import { normalizeCollectorNumber } from '../domain/numbers';
import type {
  NormalizedCard,
  NormalizedPrice,
  NormalizedSet,
  NormalizeResult,
} from '../domain/normalized';
import { optionalText, stringList } from '../domain/text';
import { sanitizeHttpsUrl, TCGDEX_URL_HOSTS } from '../domain/urls';
import type { InternalVariant } from '../domain/variants';
import { externalIdOf, integerOrNull, isRecord } from './records';

function fail(raw: unknown, issues: string[]): NormalizeResult<never> {
  return { ok: false, externalId: externalIdOf(raw), issues };
}

function assetUrl(value: unknown, suffix: string): string | null {
  const base = sanitizeHttpsUrl(value, TCGDEX_URL_HOSTS);
  if (!base) {
    return null;
  }
  const withoutQuery = base.split('?')[0] ?? base;
  if (/\.(webp|png|jpg)$/i.test(withoutQuery)) {
    return base;
  }
  return sanitizeHttpsUrl(`${withoutQuery}${suffix}`, TCGDEX_URL_HOSTS);
}

function cardCountOf(value: unknown): number | null {
  if (typeof value === 'number') {
    return integerOrNull(value, 100_000);
  }
  if (isRecord(value)) {
    return integerOrNull(value.total, 100_000);
  }
  return null;
}

export function normalizeTcgdexSet(
  raw: unknown,
  language: InternalLanguage,
): NormalizeResult<NormalizedSet> {
  if (!isRecord(raw)) {
    return fail(raw, ['Objet set invalide']);
  }
  const externalId = optionalText(raw.id, 128);
  const name = optionalText(raw.name, 200);
  if (!externalId || !name) {
    return fail(raw, ['Set TCGdex incomplet']);
  }
  const series = isRecord(raw.serie) ? optionalText(raw.serie.name, 120) : null;
  const logoUrl = assetUrl(raw.logo, '.webp');
  const symbolUrl = assetUrl(raw.symbol, '.webp');
  return {
    ok: true,
    value: {
      externalId,
      code: externalId.slice(0, 32),
      language,
      name,
      series,
      region: null,
      releaseDate: optionalText(raw.releaseDate, 10),
      logoUrl,
      symbolUrl,
      cardCount: cardCountOf(raw.cardCount),
      translations: [
        {
          language,
          name,
          series,
          logoUrl,
          symbolUrl,
          sourceExternalId: externalId,
        },
      ],
    },
  };
}

function confirmedVariants(raw: unknown): InternalVariant[] {
  if (!isRecord(raw)) {
    return [];
  }
  const variants: InternalVariant[] = [];
  if (raw.normal === true) variants.push('NORMAL');
  if (raw.holo === true) variants.push('HOLO');
  if (raw.reverse === true) variants.push('REVERSE');
  if (raw.firstEdition === true) variants.push('FIRST_EDITION');
  return variants;
}

function attacksOf(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((attack) => {
    if (!isRecord(attack)) return [];
    const name = optionalText(attack.name, 120);
    if (!name) return [];
    return [
      {
        name,
        cost: stringList(attack.cost, 8, 40),
        damage: optionalText(attack.damage, 16),
        effect: optionalText(attack.effect, 500),
      },
    ];
  });
}

function pairText(value: unknown): string | null {
  if (!Array.isArray(value) || !isRecord(value[0])) {
    return null;
  }
  const type = optionalText(value[0].type, 40);
  const amount = optionalText(value[0].value, 16);
  if (!type) {
    return null;
  }
  return amount ? `${type} ${amount}` : type;
}

export function normalizeTcgdexCard(
  raw: unknown,
  language: InternalLanguage,
): NormalizeResult<NormalizedCard> {
  if (!isRecord(raw) || raw.missing === true) {
    return fail(raw, ['Carte TCGdex indisponible']);
  }
  const externalId = optionalText(raw.id, 128);
  const number = optionalText(raw.localId, 16);
  const name = optionalText(raw.name, 200);
  const set = isRecord(raw.set) ? raw.set : null;
  const setExternalId = set ? optionalText(set.id, 128) : null;
  if (!externalId || !number || !name || !setExternalId) {
    return fail(raw, ['Carte TCGdex incomplète']);
  }
  const description = optionalText(raw.description, 2000) ?? optionalText(raw.effect, 2000);
  const attacks = attacksOf(raw.attacks);
  const rules = stringList(raw.rules, 8, 500);
  const effect = optionalText(raw.effect, 500);
  if (effect && rules.length === 0) {
    rules.push(effect);
  }
  const imageLargeUrl = assetUrl(raw.image, '/high.webp');
  const thumbnailUrl = assetUrl(raw.image, '/low.webp');
  const localisedData = {
    attacks,
    rules,
    evolveFrom: optionalText(raw.evolveFrom, 120),
    stage: optionalText(raw.stage, 40),
  };
  const subtypes = stringList(raw.subtypes, 8, 40);
  const stage = optionalText(raw.stage, 40);
  if (stage && !subtypes.includes(stage)) {
    subtypes.push(stage);
  }

  return {
    ok: true,
    value: {
      externalId,
      setExternalId,
      setCode: setExternalId.slice(0, 32),
      number,
      normalizedNumber: normalizeCollectorNumber(number),
      language,
      name,
      rarity: optionalText(raw.rarity, 80),
      supertype: optionalText(raw.category, 40),
      subtypes,
      hp: integerOrNull(raw.hp, 99999),
      types: stringList(raw.types, 4, 40),
      evolveFrom: optionalText(raw.evolveFrom, 120),
      level: optionalText(raw.level, 16),
      illustrator: optionalText(raw.illustrator, 120),
      weakness: pairText(raw.weaknesses),
      resistance: pairText(raw.resistances),
      retreatCost: integerOrNull(raw.retreat, 20),
      regulationMark: optionalText(raw.regulationMark, 8),
      description,
      attacks,
      rules,
      imageUrl: imageLargeUrl,
      imageLargeUrl,
      thumbnailUrl,
      variants: confirmedVariants(raw.variants),
      translations: [
        {
          language,
          name,
          description,
          imageUrl: imageLargeUrl,
          imageLargeUrl,
          thumbnailUrl,
          sourceExternalId: externalId,
          localisedData,
        },
      ],
    },
  };
}

function captureDay(value: unknown, now: Date): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  return now.toISOString().slice(0, 10);
}

function pushPrice(
  prices: NormalizedPrice[],
  issues: string[],
  input: {
    cardExternalId: string;
    setCode: string;
    number: string;
    language: InternalLanguage;
    variant: InternalVariant;
    confirmed: readonly InternalVariant[];
    currency: string;
    market: string | null;
    low: string | null;
    mid: string | null;
    high: string | null;
    capturedOn: string;
    sourceUrl: string | null;
    suffix: string;
  },
): void {
  if (!input.market && !input.low && !input.mid && !input.high) {
    return;
  }
  if (!input.confirmed.includes(input.variant)) {
    issues.push(`Prix ${input.suffix} ignoré: variante non confirmée`);
    return;
  }
  if (!input.market) {
    issues.push(`Prix ${input.suffix} ignoré: montant absent`);
    return;
  }
  prices.push({
    externalId: `${input.cardExternalId}:${input.suffix}`,
    cardExternalId: input.cardExternalId,
    setCode: input.setCode,
    number: input.number,
    normalizedNumber: normalizeCollectorNumber(input.number),
    variant: input.variant,
    language: input.language,
    condition: 'UNSPECIFIED',
    currency: input.currency,
    market: input.market,
    low: input.low,
    mid: input.mid,
    high: input.high,
    capturedOn: input.capturedOn,
    sourceUrl: input.sourceUrl,
  });
}

export function normalizeTcgdexPrices(
  raw: unknown,
  language: InternalLanguage,
  now = new Date(),
): { prices: NormalizedPrice[]; issues: string[]; externalId: string | null } {
  const card = normalizeTcgdexCard(raw, language);
  if (!card.ok) {
    return { prices: [], issues: card.issues, externalId: card.externalId };
  }
  if (!isRecord(raw) || !isRecord(raw.pricing)) {
    return { prices: [], issues: [], externalId: card.value.externalId };
  }
  const prices: NormalizedPrice[] = [];
  const issues: string[] = [];
  const languagePath = TCGDEX_LANGUAGE_PATHS[language];
  const sourceUrl = languagePath
    ? sanitizeHttpsUrl(
        `https://api.tcgdex.net/v2/${languagePath}/cards/${card.value.externalId}`,
        TCGDEX_URL_HOSTS,
      )
    : null;
  const base = {
    cardExternalId: card.value.externalId,
    setCode: card.value.setCode,
    number: card.value.number,
    language,
    confirmed: card.value.variants,
    sourceUrl,
  };

  const cardmarket = raw.pricing.cardmarket;
  if (isRecord(cardmarket)) {
    const currency = (optionalText(cardmarket.unit, 3) ?? 'EUR').toUpperCase();
    const capturedOn = captureDay(cardmarket.updated, now);
    if (capturedOn) {
      pushPrice(prices, issues, {
        ...base,
        variant: 'NORMAL',
        currency,
        market: moneyFromJson(cardmarket.avg),
        low: moneyFromJson(cardmarket.low),
        mid: null,
        high: null,
        capturedOn,
        suffix: 'cardmarket:NORMAL',
      });
      pushPrice(prices, issues, {
        ...base,
        variant: 'HOLO',
        currency,
        market: moneyFromJson(cardmarket['avg-holo']),
        low: moneyFromJson(cardmarket['low-holo']),
        mid: null,
        high: null,
        capturedOn,
        suffix: 'cardmarket:HOLO',
      });
    }
  }

  const tcgplayer = raw.pricing.tcgplayer;
  if (isRecord(tcgplayer)) {
    const currency = (optionalText(tcgplayer.unit, 3) ?? 'USD').toUpperCase();
    const capturedOn = captureDay(tcgplayer.updated, now);
    const blocks: Array<[string, InternalVariant]> = [
      ['normal', 'NORMAL'],
      ['reverse', 'REVERSE'],
      ['holofoil', 'HOLO'],
      ['1stEdition', 'FIRST_EDITION'],
    ];
    if (capturedOn) {
      for (const [key, variant] of blocks) {
        const block = tcgplayer[key];
        if (!isRecord(block)) {
          continue;
        }
        pushPrice(prices, issues, {
          ...base,
          variant,
          currency,
          market: moneyFromJson(block.marketPrice),
          low: moneyFromJson(block.lowPrice),
          mid: moneyFromJson(block.midPrice),
          high: moneyFromJson(block.highPrice),
          capturedOn,
          suffix: `tcgplayer:${variant}`,
        });
      }
    }
  }

  return { prices, issues, externalId: card.value.externalId };
}
