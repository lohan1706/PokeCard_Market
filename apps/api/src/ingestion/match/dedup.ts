export type SetMatch =
  | { action: 'create' }
  | { action: 'update'; id: string }
  | { action: 'conflict'; reason: 'set_code_conflict' | 'set_identity_code_mismatch' };

export function matchSet(input: {
  identityEntityId: string | null;
  existingByCode: { id: string } | null;
}): SetMatch {
  if (
    input.identityEntityId &&
    input.existingByCode &&
    input.existingByCode.id !== input.identityEntityId
  ) {
    return { action: 'conflict', reason: 'set_identity_code_mismatch' };
  }
  if (input.identityEntityId) {
    return { action: 'update', id: input.identityEntityId };
  }
  if (input.existingByCode) {
    return { action: 'conflict', reason: 'set_code_conflict' };
  }
  return { action: 'create' };
}

export type CardMatch =
  | { action: 'create' }
  | { action: 'update'; id: string }
  | {
      action: 'conflict';
      reason: 'card_number_ambiguous' | 'card_identity_mismatch';
      candidateIds: string[];
    };

export function matchCard(input: {
  identityEntityId: string | null;
  numberMatches: ReadonlyArray<{ id: string }>;
}): CardMatch {
  const ids = input.numberMatches.map((item) => item.id);
  if (input.identityEntityId) {
    const others = ids.filter((id) => id !== input.identityEntityId);
    if (others.length > 0) {
      return {
        action: 'conflict',
        reason: 'card_identity_mismatch',
        candidateIds: [input.identityEntityId, ...others],
      };
    }
    return { action: 'update', id: input.identityEntityId };
  }
  if (ids.length > 1) {
    return { action: 'conflict', reason: 'card_number_ambiguous', candidateIds: ids };
  }
  const only = ids[0];
  if (only) {
    return { action: 'update', id: only };
  }
  return { action: 'create' };
}
