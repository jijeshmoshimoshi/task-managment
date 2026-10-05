import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { EmailService } from '../../src/common/services/email.service';

vi.mock('../../src/common/services/email.service', () => ({
  EmailService: {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    sendInvitationEmail: vi.fn().mockResolvedValue(true),
  },
}));

describe('Auth Endpoints (Integration)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.spyOn(UserModel, 'findOne').mockResolvedValue(null as any);
  });

  describe('POST /api/v1/auth/login validation', () => {
    it('rejects login with missing body parameters with 422 Unprocessable Entity', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('details');
    });

    it('rejects invalid email formats', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'invalid-email-string',
        password: 'Password123!',
      });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password user enumeration defense', () => {
    it('returns 200 generic success message regardless of whether email exists or not', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists');
    });
  });

  describe('Protected endpoints authentication verification', () => {
    it('GET /api/v1/auth/me returns 401 Unauthorized without bearer token or cookie', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/audit-logs returns 401 Unauthorized without credentials', async () => {
      const res = await request(app).get('/api/v1/audit-logs');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
