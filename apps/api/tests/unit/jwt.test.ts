import { describe, it, expect } from 'vitest';
import { JwtService } from '../../src/modules/auth/services/jwt.service';
import { ROLES } from '@taskmaster/shared';

describe('JwtService', () => {
  it('signs and verifies access tokens correctly', () => {
    const payload = {
      userId: 'user_123',
      organizationId: 'org_456',
      role: ROLES.ADMIN,
      sessionId: 'sess_789',
    };

    const token = JwtService.signAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = JwtService.verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.organizationId).toBe(payload.organizationId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.sessionId).toBe(payload.sessionId);
  });

  it('signs and verifies refresh tokens correctly', () => {
    const payload = {
      userId: 'user_123',
      organizationId: 'org_456',
      sessionId: 'sess_789',
      tokenFamily: 'fam_001',
    };

    const token = JwtService.signRefreshToken(payload);
    expect(token).toBeDefined();

    const decoded = JwtService.verifyRefreshToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.sessionId).toBe(payload.sessionId);
    expect(decoded.tokenFamily).toBe(payload.tokenFamily);
  });
});
