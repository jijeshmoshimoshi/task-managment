import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { CryptoService } from '../../../common/services/crypto.service';

export class TwoFactorService {
  /**
   * Generates a new TOTP secret and QR code data URL for 2FA setup.
   */
  public static async generateSecret(
    userEmail: string,
    appName = 'TaskMaster',
  ): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(userEmail, appName, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Verifies a 6-digit TOTP token against the secret.
   */
  public static verifyToken(token: string, secret: string): boolean {
    return authenticator.check(token, secret);
  }

  /**
   * Generates new recovery codes and returns both plain codes (to display to user once)
   * and AES-256-GCM encrypted codes for safe storage in DB.
   */
  public static generateEncryptedRecoveryCodes(): {
    plainCodes: string[];
    encryptedCodes: string[];
  } {
    const plainCodes = CryptoService.generateRecoveryCodes(8);
    const encryptedCodes = plainCodes.map((code) => CryptoService.encrypt(code));
    return { plainCodes, encryptedCodes };
  }

  /**
   * Verifies a recovery code against stored encrypted codes.
   * If matched, returns the index of the code so it can be consumed and removed.
   */
  public static verifyRecoveryCode(
    providedCode: string,
    encryptedCodes: string[],
  ): number | null {
    const normalized = providedCode.trim().toUpperCase();

    for (let i = 0; i < encryptedCodes.length; i++) {
      try {
        const decrypted = CryptoService.decrypt(encryptedCodes[i]!);
        if (decrypted.toUpperCase() === normalized) {
          return i; // Matched index
        }
      } catch {
        // Continue if decryption fails for any entry
      }
    }

    return null;
  }
}
