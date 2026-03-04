const JwtKey = require('../models/JwtKey');

class JwtKeyManager {
  static jwtSecret = null;
  static jwtRefreshSecret = null;
  static initialized = false;

  /**
   * Inicializar las claves JWT desde la base de datos
   */
  static async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Inicializando claves JWT...');

      // Intentar obtener de variables de entorno primero
      this.jwtSecret = process.env.JWT_SECRET || await JwtKey.getOrCreateKey('JWT_SECRET');
      this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || await JwtKey.getOrCreateKey('JWT_REFRESH_SECRET');

      this.initialized = true;
      console.log('Claves JWT inicializadas exitosamente');

    } catch (error) {
      console.error('Error inicializando claves JWT:', error);
      // Fallback: usar valores por defecto si falla la DB
      this.jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key';
      this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-jwt-refresh-secret-key';
      console.log('Usando claves JWT de fallback');
    }
  }

  /**
   * Obtener la clave JWT_SECRET
   */
  static getJwtSecret() {
    if (!this.initialized) {
      throw new Error('JwtKeyManager no ha sido inicializado');
    }
    return this.jwtSecret;
  }

  /**
   * Obtener la clave JWT_REFRESH_SECRET
   */
  static getJwtRefreshSecret() {
    if (!this.initialized) {
      throw new Error('JwtKeyManager no ha sido inicializado');
    }
    return this.jwtRefreshSecret;
  }

  /**
   * Regenerar claves (útil para rotación de claves)
   */
  static async regenerateKeys() {
    try {
      console.log('Regenerando claves JWT...');

      this.jwtSecret = await JwtKey.getOrCreateKey('JWT_SECRET');
      this.jwtRefreshSecret = await JwtKey.getOrCreateKey('JWT_REFRESH_SECRET');

      console.log('Claves JWT regeneradas exitosamente');
      return true;
    } catch (error) {
      console.error('Error regenerando claves JWT:', error);
      return false;
    }
  }
}

module.exports = JwtKeyManager;