import { readCookie } from '../../src/auth/cookies';
import { createSessionToken, hashSessionToken } from '../../src/auth/session-token';

describe('session tokens', () => {
  it('stores a hash instead of the raw cookie value', () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);

    expect(token).not.toBe(hash);
    expect(hash).toHaveLength(64);
    expect(hashSessionToken(token)).toBe(hash);
  });

  it('reads one named cookie', () => {
    expect(readCookie('pcm_session=abc%2Fdef; other=1', 'pcm_session')).toBe('abc/def');
    expect(readCookie(undefined, 'pcm_session')).toBeUndefined();
    expect(readCookie('other=1', 'pcm_session')).toBeUndefined();
  });
});
