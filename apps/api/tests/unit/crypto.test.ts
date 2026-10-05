import { describe, it, expect } from 'vitest';
import { CryptoService } from '../../src/common/services/crypto.service';

describe('CryptoService', () => {
  it('hashes and verifies passwords accurately with Argon2id', async () => {
    const password = 'StrongPassword123!';
    const hash = await CryptoService.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isValid = await CryptoService.verifyPassword(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await CryptoService.verifyPassword(hash, 'WrongPassword456!');
    expect(isInvalid).toBe(false);
  });

  it('encrypts and decrypts secrets with AES-256-GCM envelope encryption', () => {
    const secret = 'JBSWY3DPEHPK3PXP'; // Standard Base32 TOTP secret
    const encrypted = CryptoService.encrypt(secret);

    expect(encrypted).toBeDefined();
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:cipher

    const decrypted = CryptoService.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('generates random hex tokens and hashes them consistently', () => {
    const token = CryptoService.generateRandomToken(32);
    expect(token.length).toBe(64); // 32 bytes in hex = 64 chars

    const hash1 = CryptoService.hashToken(token);
    const hash2 = CryptoService.hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it('generates valid 2FA recovery backup codes', () => {
    const codes = CryptoService.generateRecoveryCodes(8);
    expect(codes.length).toBe(8);
    codes.forEach((code) => {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    });
  });
});
