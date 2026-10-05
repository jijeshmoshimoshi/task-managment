import crypto from 'crypto';
import argon2 from 'argon2';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;

  /**
   * Hashes a plain-text password using Argon2id with memory-hard parameters.
   */
  public static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verifies a plain-text password against an Argon2id hash.
   */
  public static async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  /**
   * Generates a secure random hex token (e.g., for invites, password resets).
   */
  public static generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes a token using SHA-256 for secure storage in DB.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Encrypts sensitive string data (e.g., 2FA secret, API keys) using AES-256-GCM envelope encryption.
   */
  public static encrypt(plainText: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = Buffer.from(env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts AES-256-GCM encrypted string data.
   */
  public static decrypt(cipherTextWithMeta: string): string {
    const parts = cipherTextWithMeta.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');
    const key = Buffer.from(env.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Checks whether a password has been exposed in data breaches via HIBP k-Anonymity API.
   * Returns true if breached, false otherwise.
   */
  public static async isPasswordBreached(password: string): Promise<boolean> {
    try {
      const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.substring(0, 5);
      const suffix = sha1.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
      });

      if (!response.ok) {
        // Fallback gracefully without blocking user if HIBP API is unreachable
        logger.warn('HIBP password check API was unreachable');
        return false;
      }

      const text = await response.text();
      const lines = text.split('\n');
      for (const line of lines) {
        const [hashSuffix] = line.split(':');
        if (hashSuffix && hashSuffix.trim() === suffix) {
          return true;
        }
      }
      return false;
    } catch (err) {
      logger.warn({ err }, 'Error checking breached password via HIBP');
      return false;
    }
  }

  /**
   * Generates a set of 8 random 2FA recovery backup codes (e.g. "ABCD-1234").
   */
  public static generateRecoveryCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }
}
