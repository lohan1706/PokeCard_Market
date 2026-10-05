export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function externalIdOf(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = value.id ?? value.priceId ?? value.cardId;
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null;
}

export function integerOrNull(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) {
    return null;
  }
  return value;
}
