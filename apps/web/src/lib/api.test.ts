import { describe, expect, it } from 'vitest';
import { buildApiUrl } from './api';

describe('buildApiUrl', () => {
  it('prefixes a relative path with the versioned API root', () => {
    expect(buildApiUrl('health')).toBe('/api/v1/health');
    expect(buildApiUrl('/health')).toBe('/api/v1/health');
  });
});
