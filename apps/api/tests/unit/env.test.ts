import { describe, it, expect } from 'vitest';
import { env } from '../../src/config/env';

describe('API Environment Config', () => {
  it('loads valid default configurations', () => {
    expect(env).toBeDefined();
    expect(env.PORT).toBeGreaterThan(0);
    expect(env.API_PREFIX).toBe('/api/v1');
    expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});
