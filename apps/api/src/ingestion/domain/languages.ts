export const INTERNAL_LANGUAGES = [
  'fr',
  'en',
  'ja',
  'de',
  'es',
  'it',
  'pt-BR',
  'ko',
  'zh-Hans',
  'zh-Hant',
] as const;

export type InternalLanguage = (typeof INTERNAL_LANGUAGES)[number];

const LANGUAGE_ALIASES: Record<string, InternalLanguage> = {
  fr: 'fr',
  fra: 'fr',
  french: 'fr',
  français: 'fr',
  en: 'en',
  eng: 'en',
  english: 'en',
  ja: 'ja',
  jp: 'ja',
  jpn: 'ja',
  japanese: 'ja',
  de: 'de',
  ger: 'de',
  deu: 'de',
  german: 'de',
  deutsch: 'de',
  es: 'es',
  spa: 'es',
  spanish: 'es',
  español: 'es',
  it: 'it',
  ita: 'it',
  italian: 'it',
  italiano: 'it',
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  pt_br: 'pt-BR',
  portuguese: 'pt-BR',
  ko: 'ko',
  kor: 'ko',
  korean: 'ko',
  'zh-hans': 'zh-Hans',
  zh_cn: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-hant': 'zh-Hant',
  zh_tw: 'zh-Hant',
  'zh-tw': 'zh-Hant',
};

export function mapLanguage(value: string | null | undefined): InternalLanguage | null {
  if (!value) {
    return null;
  }
  const key = value.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] ?? null;
}

export function isInternalLanguage(value: string): value is InternalLanguage {
  return (INTERNAL_LANGUAGES as readonly string[]).includes(value);
}

/** Path segment published by the TCGdex REST API. Not every internal language has a path. */
export const TCGDEX_LANGUAGE_PATHS: Partial<Record<InternalLanguage, string>> = {
  fr: 'fr',
  en: 'en',
  ja: 'ja',
  de: 'de',
  es: 'es',
  it: 'it',
  'pt-BR': 'pt',
  'zh-Hant': 'zh-tw',
};
