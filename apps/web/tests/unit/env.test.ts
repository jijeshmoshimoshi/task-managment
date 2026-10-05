import { describe, it, expect } from 'vitest';
import { env } from '../../src/lib/env';

describe('Web Environment Config', () => {
  it('loads valid web environment defaults', () => {
    expect(env).toBeDefined();
    expect(env.NEXT_PUBLIC_APP_NAME).toBe('TaskMaster');
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://localhost:5000/api/v1');
  });
});
