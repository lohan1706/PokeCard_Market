export function cleanText(value: string, max: number): string {
  return value.split('\u0000').join('').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = cleanText(value, max);
  return cleaned.length > 0 ? cleaned : null;
}

export function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }
    const cleaned = cleanText(entry, maxLength);
    if (cleaned.length > 0) {
      items.push(cleaned);
    }
    if (items.length >= maxItems) {
      break;
    }
  }
  return items;
}
