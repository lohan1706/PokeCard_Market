export const INTERNAL_VARIANTS = ['NORMAL', 'HOLO', 'REVERSE', 'FIRST_EDITION'] as const;

export type InternalVariant = (typeof INTERNAL_VARIANTS)[number];

const VARIANT_ALIASES: Record<string, InternalVariant> = {
  normal: 'NORMAL',
  normale: 'NORMAL',
  holo: 'HOLO',
  holofoil: 'HOLO',
  reverse: 'REVERSE',
  'reverse holo': 'REVERSE',
  reverseholo: 'REVERSE',
  reverseholofoil: 'REVERSE',
  firstedition: 'FIRST_EDITION',
  'first edition': 'FIRST_EDITION',
  first_edition: 'FIRST_EDITION',
  '1stedition': 'FIRST_EDITION',
};

export function isInternalVariant(value: string): value is InternalVariant {
  return (INTERNAL_VARIANTS as readonly string[]).includes(value);
}

export function mapVariant(value: string | null | undefined): InternalVariant | null {
  if (!value) {
    return null;
  }
  const key = value.trim().toLowerCase();
  return VARIANT_ALIASES[key] ?? null;
}
