const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Clave de encriptación (solo si es necesaria)
let ENCRYPTION_KEY = null;
if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32) {
  ENCRYPTION_KEY = crypto.scryptSync(
    process.env.ENCRYPTION_KEY, 
    'salt', 
    32
  );
}

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const encryptSensitiveData = (text) => {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY no configurada correctamente');
  }
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Error encrypting sensitive data:', error.message);
    throw new Error('Error encrypting sensitive data');
  }
};

const decryptSensitiveData = (encryptedData) => {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY no configurada correctamente');
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting sensitive data:', error.message);
    throw new Error('Error decrypting sensitive data');
  }
};

const hashPassword = async (password) => {
  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    return await bcrypt.hash(password, rounds);
  } catch (error) {
    console.error('Error hashing password:', error.message);
    throw new Error('Error hashing password');
  }
};

const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error comparing password:', error.message);
    throw new Error('Error comparing password');
  }
};

module.exports = {
  encryptSensitiveData,
  decryptSensitiveData,
  hashPassword,
  comparePassword
};