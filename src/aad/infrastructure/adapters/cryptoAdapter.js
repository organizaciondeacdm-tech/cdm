const crypto = require('crypto');

class CryptoAdapter {
  constructor() {
    const rawKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-change-this-key';
    this.key = crypto.createHash('sha256').update(rawKey).digest();
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const serialized = JSON.stringify(value);
    const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedPayload: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  decrypt({ encryptedPayload, iv, authTag }) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPayload, 'base64')),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }
}

module.exports = new CryptoAdapter();
