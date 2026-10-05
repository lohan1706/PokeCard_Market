import { matchCard, matchSet } from '../../src/ingestion/match/dedup';
import { DemoProvider } from '../../src/ingestion/providers/demo.provider';
import { InvalidCursorError } from '../../src/ingestion/domain/numbers';

describe('ingestion deduplication and demo pagination', () => {
  it('refuses to attach a set code that already exists', () => {
    expect(matchSet({ identityEntityId: null, existingByCode: { id: 'seed' } })).toEqual({
      action: 'conflict',
      reason: 'set_code_conflict',
    });
    expect(matchSet({ identityEntityId: 'own', existingByCode: { id: 'own' } })).toEqual({
      action: 'update',
      id: 'own',
    });
    expect(matchSet({ identityEntityId: null, existingByCode: null })).toEqual({
      action: 'create',
    });
  });

  it('treats 25 and 025 as one candidate and stops when two candidates exist', () => {
    expect(matchCard({ identityEntityId: null, numberMatches: [{ id: 'a' }] })).toEqual({
      action: 'update',
      id: 'a',
    });
    const ambiguous = matchCard({
      identityEntityId: null,
      numberMatches: [{ id: 'a' }, { id: 'b' }],
    });
    expect(ambiguous).toEqual({
      action: 'conflict',
      reason: 'card_number_ambiguous',
      candidateIds: ['a', 'b'],
    });
    const mismatch = matchCard({
      identityEntityId: 'a',
      numberMatches: [{ id: 'a' }, { id: 'b' }],
    });
    expect(mismatch.action).toBe('conflict');
    if (mismatch.action === 'conflict') {
      expect(mismatch.reason).toBe('card_identity_mismatch');
    }
  });

  it('pages local fixtures and rejects a bad cursor', async () => {
    const provider = new DemoProvider();
    const first = await provider.listCards({ limit: 1, setExternalId: 'INGEST1' });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBe('1');
    const second = await provider.listCards({ limit: 1, setExternalId: 'INGEST1', cursor: '1' });
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBe('2');
    await expect(provider.listSets({ limit: 1, cursor: 'next' })).rejects.toBeInstanceOf(
      InvalidCursorError,
    );
  });
});
