import { describe, expect, it } from 'vitest';
import { hasErrors, validateLogin, validateRegister } from './validation';

describe('auth form validation', () => {
  it('accepts a collector password and rejects a short one', () => {
    expect(
      hasErrors(
        validateRegister({
          email: 'lea@demo.pokecard.local',
          displayName: 'Léa Martin',
          password: 'Motdepasse1',
        }),
      ),
    ).toBe(false);

    const errors = validateRegister({
      email: 'lea',
      displayName: 'L',
      password: 'court',
    });
    expect(errors.email).toBeDefined();
    expect(errors.displayName).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('requires a password on login', () => {
    expect(
      validateLogin({ email: 'lea@demo.pokecard.local', password: '' }).password,
    ).toBeDefined();
  });
});
