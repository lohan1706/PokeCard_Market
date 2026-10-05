import { mapCondition } from '../domain/conditions';
import { mapLanguage } from '../domain/languages';
import { normalizeMoney } from '../domain/money';
import { normalizeCollectorNumber } from '../domain/numbers';
import type {
  NormalizedCard,
  NormalizedPrice,
  NormalizedSet,
  NormalizeResult,
} from '../domain/normalized';
import { optionalText, stringList } from '../domain/text';
import { sanitizeHttpsUrl, DEMO_URL_HOSTS } from '../domain/urls';
import { mapVariant, type InternalVariant } from '../domain/variants';
import { externalIdOf, integerOrNull, isRecord } from './records';

function fail(raw: unknown, issues: string[]): NormalizeResult<never> {
  return { ok: false, externalId: externalIdOf(raw), issues };
}

export function normalizeDemoSet(raw: unknown): NormalizeResult<NormalizedSet> {
  if (!isRecord(raw)) {
    return fail(raw, ['Objet set invalide']);
  }
  const externalId = optionalText(raw.id, 128);
  const code = optionalText(raw.code, 32);
  const name = optionalText(raw.name, 200);
  const language = mapLanguage(typeof raw.lang === 'string' ? raw.lang : null);
  const issues: string[] = [];
  if (!externalId) issues.push('Identifiant de set manquant');
  if (!code) issues.push('Code de set manquant');
  if (!name) issues.push('Nom de set manquant');
  if (!language) issues.push('Langue de set inconnue');
  if (!externalId || !code || !name || !language) {
    return fail(raw, issues);
  }

  const translations = [];
  if (isRecord(raw.names)) {
    for (const [alias, value] of Object.entries(raw.names)) {
      const translatedLanguage = mapLanguage(alias);
      const translatedName = optionalText(value, 200);
      if (!translatedLanguage || !translatedName || translatedLanguage === language) {
        continue;
      }
      translations.push({
        language: translatedLanguage,
        name: translatedName,
        series: optionalText(raw.serie, 120),
        logoUrl: sanitizeHttpsUrl(raw.logo, DEMO_URL_HOSTS),
        symbolUrl: sanitizeHttpsUrl(raw.symbol, DEMO_URL_HOSTS),
        sourceExternalId: externalId,
      });
    }
  }
  translations.unshift({
    language,
    name,
    series: optionalText(raw.serie, 120),
    logoUrl: sanitizeHttpsUrl(raw.logo, DEMO_URL_HOSTS),
    symbolUrl: sanitizeHttpsUrl(raw.symbol, DEMO_URL_HOSTS),
    sourceExternalId: externalId,
  });

  return {
    ok: true,
    value: {
      externalId,
      code,
      language,
      name,
      series: optionalText(raw.serie, 120),
      region: optionalText(raw.region, 16),
      releaseDate: optionalText(raw.release, 10),
      logoUrl: sanitizeHttpsUrl(raw.logo, DEMO_URL_HOSTS),
      symbolUrl: sanitizeHttpsUrl(raw.symbol, DEMO_URL_HOSTS),
      cardCount: integerOrNull(raw.count, 100_000),
      translations,
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

export function normalizeDemoCard(raw: unknown): NormalizeResult<NormalizedCard> {
  if (!isRecord(raw)) {
    return fail(raw, ['Objet carte invalide']);
  }
  const externalId = optionalText(raw.id, 128);
  const setExternalId = optionalText(raw.setId, 128);
  const setCode = optionalText(raw.setCode, 32);
  const number = optionalText(raw.localId, 16);
  const name = optionalText(raw.name, 200);
  const language = mapLanguage(typeof raw.lang === 'string' ? raw.lang : null);
  const issues: string[] = [];
  if (!externalId) issues.push('Identifiant de carte manquant');
  if (!setExternalId) issues.push('Set de carte manquant');
  if (!setCode) issues.push('Code de set manquant');
  if (!number) issues.push('Numéro de carte manquant');
  if (!name) issues.push('Nom de carte manquant');
  if (!language) issues.push('Langue de carte inconnue');
  if (!externalId || !setExternalId || !setCode || !number || !name || !language) {
    return fail(raw, issues);
  }

  const attacks = Array.isArray(raw.attacks)
    ? raw.attacks.flatMap((attack) => {
        if (!isRecord(attack)) return [];
        const attackName = optionalText(attack.name, 120);
        if (!attackName) return [];
        return [
          {
            name: attackName,
            cost: stringList(attack.cost, 8, 40),
            damage: optionalText(attack.damage, 16),
            effect: optionalText(attack.text, 500),
          },
        ];
      })
    : [];
  const description = optionalText(raw.description, 2000);
  const imageUrl = sanitizeHttpsUrl(raw.image, DEMO_URL_HOSTS);
  const localisedData = { attacks, rules: [] as string[] };
  const translations = [
    {
      language,
      name,
      description,
      imageUrl,
      imageLargeUrl: imageUrl,
      thumbnailUrl: imageUrl,
      sourceExternalId: externalId,
      localisedData,
    },
  ];
  if (Array.isArray(raw.translations)) {
    for (const entry of raw.translations) {
      if (!isRecord(entry)) continue;
      const translatedLanguage = mapLanguage(typeof entry.lang === 'string' ? entry.lang : null);
      const translatedName = optionalText(entry.name, 200);
      if (!translatedLanguage || !translatedName || translatedLanguage === language) continue;
      translations.push({
        language: translatedLanguage,
        name: translatedName,
        description: optionalText(entry.description, 2000),
        imageUrl: null,
        imageLargeUrl: null,
        thumbnailUrl: null,
        sourceExternalId: externalId,
        localisedData,
      });
    }
  }

  return {
    ok: true,
    value: {
      externalId,
      setExternalId,
      setCode,
      number,
      normalizedNumber: normalizeCollectorNumber(number),
      language,
      name,
      rarity: optionalText(raw.rarity, 80),
      supertype: optionalText(raw.category, 40),
      subtypes: stringList(raw.subtypes, 8, 40),
      hp: integerOrNull(raw.hp, 99999),
      types: stringList(raw.types, 4, 40),
      evolveFrom: optionalText(raw.evolveFrom, 120),
      level: optionalText(raw.level, 16),
      illustrator: optionalText(raw.illustrator, 120),
      weakness: optionalText(raw.weakness, 80),
      resistance: optionalText(raw.resistance, 80),
      retreatCost: integerOrNull(raw.retreat, 20),
      regulationMark: optionalText(raw.regulation, 8),
      description,
      attacks,
      rules: [],
      imageUrl,
      imageLargeUrl: imageUrl,
      thumbnailUrl: imageUrl,
      variants: confirmedVariants(raw.variants),
      translations,
    },
  };
}

export function normalizeDemoPrice(
  raw: unknown,
  overrides?: ReadonlyMap<string, string>,
): NormalizeResult<NormalizedPrice> {
  if (!isRecord(raw)) {
    return fail(raw, ['Objet prix invalide']);
  }
  const externalId = optionalText(raw.priceId, 128);
  const cardExternalId = optionalText(raw.cardId, 128);
  const setCode = optionalText(raw.setCode, 32);
  const number = optionalText(raw.localId, 16);
  const variant = mapVariant(typeof raw.variant === 'string' ? raw.variant : null);
  const language = mapLanguage(typeof raw.lang === 'string' ? raw.lang : null);
  const condition = mapCondition(
    typeof raw.condition === 'string' ? raw.condition : null,
    overrides,
  );
  const currency = optionalText(raw.currency, 3)?.toUpperCase() ?? null;
  const market = typeof raw.market === 'string' ? normalizeMoney(raw.market) : null;
  const issues: string[] = [];
  if (!externalId) issues.push('Identifiant de prix manquant');
  if (!cardExternalId) issues.push('Carte du prix manquante');
  if (!setCode) issues.push('Set du prix manquant');
  if (!number) issues.push('Numéro du prix manquant');
  if (!variant) issues.push('Variante de prix inconnue');
  if (!language) issues.push('Langue de prix inconnue');
  if (!condition.ok) issues.push(condition.reason);
  if (!currency || !/^[A-Z]{3}$/.test(currency)) issues.push('Devise invalide');
  if (!market) issues.push('Montant invalide');
  if (
    !externalId ||
    !cardExternalId ||
    !setCode ||
    !number ||
    !variant ||
    !language ||
    !condition.ok ||
    !currency ||
    !/^[A-Z]{3}$/.test(currency) ||
    !market
  ) {
    return fail(raw, issues);
  }

  return {
    ok: true,
    value: {
      externalId,
      cardExternalId,
      setCode,
      number,
      normalizedNumber: normalizeCollectorNumber(number),
      variant,
      language,
      condition: condition.value,
      currency,
      market,
      low: typeof raw.low === 'string' ? normalizeMoney(raw.low) : null,
      mid: typeof raw.mid === 'string' ? normalizeMoney(raw.mid) : null,
      high: typeof raw.high === 'string' ? normalizeMoney(raw.high) : null,
      capturedOn: optionalText(raw.capturedOn, 10) ?? '',
      sourceUrl: sanitizeHttpsUrl(raw.url, DEMO_URL_HOSTS),
    },
  };
}
