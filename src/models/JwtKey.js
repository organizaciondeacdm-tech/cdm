const mongoose = require('mongoose');
const crypto = require('crypto');

const jwtKeySchema = new mongoose.Schema({
  keyType: {
    type: String,
    required: true,
    enum: ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
    unique: true
  },
  keyValue: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generar una clave segura
jwtKeySchema.statics.generateSecureKey = function(length = 64) {
  return crypto.randomBytes(length).toString('base64');
};

// Obtener o crear clave
jwtKeySchema.statics.getOrCreateKey = async function(keyType) {
  try {
    let keyDoc = await this.findOne({ keyType });

    if (!keyDoc) {
      console.log(`Generando nueva clave ${keyType}...`);
      const keyValue = this.generateSecureKey();
      keyDoc = new this({
        keyType,
        keyValue
      });
      await keyDoc.save();
      console.log(`Clave ${keyType} generada y guardada exitosamente`);
    }

    return keyDoc.keyValue;
  } catch (error) {
    console.error(`Error obteniendo/creando clave ${keyType}:`, error);
    throw error;
  }
};

module.exports = mongoose.model('JwtKey', jwtKeySchema);