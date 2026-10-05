export function normalizeCollectorNumber(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const match = /^0*(\d+)([^0-9].*)?$/.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const digits = match[1] ?? '';
  const suffix = (match[2] ?? '').trim();
  const numeric = String(Number(digits));
  return `${numeric}${suffix}`;
}

export function decodeOffset(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }
  if (!/^\d{1,8}$/.test(cursor)) {
    throw new InvalidCursorError();
  }
  return Number(cursor);
}

export class InvalidCursorError extends Error {
  constructor() {
    super('Curseur de pagination invalide');
    this.name = 'InvalidCursorError';
  }
}

export function slicePage<T>(
  items: readonly T[],
  cursor: string | null | undefined,
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const offset = decodeOffset(cursor);
  const page = items.slice(offset, offset + limit);
  const next = offset + page.length;
  return {
    items: page,
    nextCursor: next < items.length ? String(next) : null,
  };
}
