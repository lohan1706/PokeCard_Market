import { hashPassword, verifyPassword } from '../../prisma/password';

describe('hashPassword', () => {
  it('verifies the original password and rejects another', () => {
    const stored = hashPassword('DemoCollector!2026', 'pokecard-demo-lea-salt');

    expect(verifyPassword('DemoCollector!2026', stored)).toBe(true);
    expect(verifyPassword('wrong-password', stored)).toBe(false);
  });
});
