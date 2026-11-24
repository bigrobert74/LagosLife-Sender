import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    // 32-byte master key for AES-256-GCM envelope encryption
    const secret =
      process.env.OWNER_CREDENTIALS_SECRET ||
      'lagos-life-master-vault-encryption-secret-key-32bytes!';
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   * Returns formatted string: ivHex:authTagHex:ciphertextHex
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypts formatted envelope string (ivHex:authTagHex:ciphertextHex) using AES-256-GCM.
   */
  decrypt(payload: string): string {
    if (!payload || !payload.includes(':')) {
      throw new Error('Invalid encrypted payload format');
    }
    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new Error('Malformed encryption envelope parts');
    }
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Returns safely masked version of PIN e.g. "••••"
   */
  maskPin(pin: string): string {
    return '••••';
  }
}
