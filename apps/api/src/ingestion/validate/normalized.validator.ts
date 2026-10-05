import { isInternalCondition } from '../domain/conditions';
import { isInternalLanguage } from '../domain/languages';
import { normalizeMoney } from '../domain/money';
import type { NormalizedCard, NormalizedPrice, NormalizedSet } from '../domain/normalized';
import { isInternalVariant } from '../domain/variants';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function validDay(value: string | null, now: Date, required: boolean): string | null {
  if (!value) {
    return required ? 'Date manquante' : null;
  }
  if (!DAY.test(value)) {
    return 'Date invalide';
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return 'Date invalide';
  }
  if (value > now.toISOString().slice(0, 10)) {
    return 'Date future';
  }
  return null;
}

export function validateSet(value: NormalizedSet, now = new Date()): string[] {
  const issues: string[] = [];
  if (!isInternalLanguage(value.language)) issues.push('Langue invalide');
  if (value.name.length === 0) issues.push('Nom manquant');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(value.code)) issues.push('Code de set invalide');
  const dateIssue = validDay(value.releaseDate, now, false);
  if (dateIssue) issues.push(dateIssue);
  return issues;
}

export function validateCard(value: NormalizedCard): string[] {
  const issues: string[] = [];
  if (!isInternalLanguage(value.language)) issues.push('Langue invalide');
  if (value.name.length === 0) issues.push('Nom manquant');
  if (value.number.length === 0 || value.number.length > 16) issues.push('Numéro invalide');
  if (value.externalId.length === 0 || value.externalId.length > 128)
    issues.push('Identifiant invalide');
  if (value.variants.some((variant) => !isInternalVariant(variant)))
    issues.push('Variante invalide');
  return issues;
}

export function validatePrice(value: NormalizedPrice, now = new Date()): string[] {
  const issues: string[] = [];
  if (!isInternalLanguage(value.language)) issues.push('Langue invalide');
  if (!isInternalVariant(value.variant)) issues.push('Variante invalide');
  if (!isInternalCondition(value.condition)) issues.push('Condition invalide');
  if (!/^[A-Z]{3}$/.test(value.currency)) issues.push('Devise invalide');
  if (!normalizeMoney(value.market)) issues.push('Montant invalide');
  for (const amount of [value.low, value.mid, value.high]) {
    if (amount !== null && !normalizeMoney(amount)) issues.push('Montant secondaire invalide');
  }
  const dateIssue = validDay(value.capturedOn, now, true);
  if (dateIssue) issues.push(dateIssue);
  return issues;
}
