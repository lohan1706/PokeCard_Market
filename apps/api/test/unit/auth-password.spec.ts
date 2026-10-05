import { hashPassword as hashScryptPassword } from '../../prisma/password';
import { hashPassword, needsRehash, verifyPassword } from '../../src/auth/password';

describe('password hashing', () => {
  it('stores an argon2id hash that verifies only the original password', async () => {
    const stored = await hashPassword('Valide1234');

    expect(stored.startsWith('$argon2id$')).toBe(true);
    expect(stored).not.toContain('Valide1234');
    expect(needsRehash(stored)).toBe(false);
    expect(await verifyPassword('Valide1234', stored)).toBe(true);
    expect(await verifyPassword('Autre12345', stored)).toBe(false);
  });

  it('still verifies the scrypt hashes created by the demo seed', async () => {
    const stored = hashScryptPassword('DemoCollector!2026', 'pokecard-demo-lea-salt');

    expect(needsRehash(stored)).toBe(true);
    expect(await verifyPassword('DemoCollector!2026', stored)).toBe(true);
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('rejects a malformed hash without throwing', async () => {
    await expect(verifyPassword('Valide1234', 'not-a-hash')).resolves.toBe(false);
  });
});
