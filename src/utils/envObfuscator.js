const crypto = require('crypto');

const ALGO = 'aes-256-cbc';
const strictEnv = !['development', 'test'].includes(String(process.env.NODE_ENV || '').toLowerCase());
const SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || (strictEnv ? '' : 'dev-only-env-obfuscator-secret');
const hasSecret = Boolean(SECRET);

const getCryptoKey = () => {
    if (!hasSecret) {
        throw new Error('ENCRYPTION_KEY/JWT_SECRET es requerido para operaciones de envObfuscator');
    }
    return crypto.createHash('sha256').update(String(SECRET)).digest();
};

const obfuscate = (text) => {
    if (!text) return text;
    if (text.startsWith('ENC:')) return text; // already encrypted
    if (!hasSecret) {
        if (strictEnv) {
            throw new Error('No se puede ofuscar sin ENCRYPTION_KEY/JWT_SECRET en entorno estricto');
        }
        return text;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, getCryptoKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `ENC:${iv.toString('hex')}:${encrypted}`;
};

const deobfuscate = (encryptedText) => {
    if (!encryptedText) return encryptedText;
    if (!encryptedText.startsWith('ENC:')) return encryptedText;
    if (!hasSecret) {
        console.warn('envObfuscator: valor ENC detectado sin ENCRYPTION_KEY/JWT_SECRET, devolviendo valor original');
        return encryptedText;
    }

    try {
        const [, ivHex, payloadHex] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGO, getCryptoKey(), iv);

        let decrypted = decipher.update(payloadHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        console.error('Error decrypting env var:', err.message);
        return encryptedText;
    }
};

const getMongoUri = () => {
    return deobfuscate(process.env.MONGODB_URI);
};

module.exports = {
    obfuscate,
    deobfuscate,
    getMongoUri
};
