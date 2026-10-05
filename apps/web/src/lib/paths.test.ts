import { describe, expect, it } from 'vitest';
import { isAuthPath, isProtectedPath, safeNextPath } from './paths';

describe('route protection helpers', () => {
  it('protects the dashboard and administration', () => {
    expect(isProtectedPath('/dashboard')).toBe(true);
    expect(isProtectedPath('/admin/summary')).toBe(true);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isAuthPath('/register')).toBe(true);
  });

  it('keeps post-login redirects on this site', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('https://example.test')).toBe('/dashboard');
    expect(safeNextPath('//example.test')).toBe('/dashboard');
    expect(safeNextPath('/login')).toBe('/dashboard');
  });
});
