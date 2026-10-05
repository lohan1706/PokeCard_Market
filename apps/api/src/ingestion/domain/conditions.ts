export const INTERNAL_CONDITIONS = ['UNSPECIFIED', 'NM', 'LP', 'MP', 'HP', 'DM'] as const;

export type InternalCondition = (typeof INTERNAL_CONDITIONS)[number];

const CONDITION_ALIASES: Record<string, InternalCondition> = {
  UNSPECIFIED: 'UNSPECIFIED',
  UNKNOWN: 'UNSPECIFIED',
  NM: 'NM',
  'NEAR MINT': 'NM',
  NEAR_MINT: 'NM',
  NEARMINT: 'NM',
  MINT: 'NM',
  LP: 'LP',
  'LIGHTLY PLAYED': 'LP',
  LIGHTLY_PLAYED: 'LP',
  MP: 'MP',
  'MODERATELY PLAYED': 'MP',
  MODERATELY_PLAYED: 'MP',
  HP: 'HP',
  'HEAVILY PLAYED': 'HP',
  HEAVILY_PLAYED: 'HP',
  DM: 'DM',
  DAMAGED: 'DM',
};

export function isInternalCondition(value: string): value is InternalCondition {
  return (INTERNAL_CONDITIONS as readonly string[]).includes(value);
}

export function mapCondition(
  value: string | null | undefined,
  overrides?: ReadonlyMap<string, string>,
): { ok: true; value: InternalCondition } | { ok: false; reason: string } {
  if (!value || value.trim().length === 0) {
    return { ok: true, value: 'UNSPECIFIED' };
  }
  const key = value.trim().toUpperCase();
  const override = overrides?.get(key);
  if (override) {
    if (!isInternalCondition(override)) {
      return { ok: false, reason: 'Correspondance de condition invalide' };
    }
    return { ok: true, value: override };
  }
  const mapped = CONDITION_ALIASES[key];
  if (!mapped) {
    return { ok: false, reason: `Condition inconnue: ${key.slice(0, 40)}` };
  }
  return { ok: true, value: mapped };
}
