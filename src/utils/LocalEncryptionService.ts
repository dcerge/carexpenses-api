// ./src/utils/LocalEncryptionService.ts
import crypto from 'crypto';
import config from '../config';

export class LocalEncryptionService {
  private masterKey: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly PREFIX = 'enc:v1:'; // Prefix to identify encrypted strings

  constructor() {
    const keyHex = config.cemk;

    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'CEMK (ENCRYPTION MASTER KEY) must be a 64-character hex string (256 bits). ' +
          'Generate one with: openssl rand -hex 32',
      );
    }

    this.masterKey = Buffer.from(keyHex, 'hex');
  }

  private deriveKeyForAccount(accountId: string): Buffer {
    return Buffer.from(crypto.hkdfSync('sha256', this.masterKey, accountId, 'connector-config-v1', 32));
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(this.PREFIX);
  }

  encrypt(plaintext: string, accountId: string): string {
    const key = this.deriveKeyForAccount(accountId);
    const iv = crypto.randomBytes(12); // 12 bytes

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag(); // 16 bytes

    // Concatenate: iv (12) + authTag (16) + ciphertext (variable)
    const combined = Buffer.concat([iv, authTag, ciphertext]);

    return this.PREFIX + combined.toString('base64');
  }

  decrypt(encrypted: string, accountId: string): string {
    if (!this.isEncrypted(encrypted)) {
      throw new Error('Value is not encrypted');
    }

    const combined = Buffer.from(encrypted.slice(this.PREFIX.length), 'base64');

    // Extract components: iv (12) + authTag (16) + ciphertext (rest)
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const key = this.deriveKeyForAccount(accountId);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

    return plaintext;
  }
}

export const localEncryptionService = new LocalEncryptionService();
