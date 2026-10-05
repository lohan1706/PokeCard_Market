const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export function normalizeMoney(value: string): string | null {
  const trimmed = value.trim();
  if (!MONEY_PATTERN.test(trimmed)) {
    return null;
  }
  const [whole, fraction = ''] = trimmed.split('.');
  if (whole === undefined) {
    return null;
  }
  return `${whole}.${(fraction + '00').slice(0, 2)}`;
}

export function moneyFromJson(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0 || value > 9_999_999_999) {
      return null;
    }
    return normalizeMoney(value.toFixed(2));
  }
  if (typeof value === 'string') {
    return normalizeMoney(value);
  }
  return null;
}

export function toCents(value: string): bigint | null {
  const normalized = normalizeMoney(value);
  if (!normalized) {
    return null;
  }
  const [whole, fraction = '00'] = normalized.split('.');
  if (whole === undefined) {
    return null;
  }
  return BigInt(whole) * 100n + BigInt(fraction);
}

export function fromCents(cents: bigint): string {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

export function moneyEqual(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (left == null || right == null) {
    return left == null && right == null;
  }
  const a = toCents(left);
  const b = toCents(right);
  if (a === null || b === null) {
    return false;
  }
  return a === b;
}
