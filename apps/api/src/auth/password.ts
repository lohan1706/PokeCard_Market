import { scryptSync, timingSafeEqual } from 'node:crypto';
import { hash, verify, type Algorithm } from '@node-rs/argon2';

const ARGON2ID: Algorithm = 2;

const ARGON_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export function needsRehash(stored: string): boolean {
  return !stored.startsWith('$argon2id$');
}

function verifyScryptPassword(password: string, stored: string): boolean {
  const [algorithm, salt, digest] = stored.split(':');
  if (algorithm !== 'scrypt' || !salt || !digest) {
    return false;
  }
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(digest, 'hex');
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith('$argon2')) {
      return await verify(stored, password);
    }
    if (stored.startsWith('scrypt:')) {
      return verifyScryptPassword(password, stored);
    }
    return false;
  } catch {
    return false;
  }
}
