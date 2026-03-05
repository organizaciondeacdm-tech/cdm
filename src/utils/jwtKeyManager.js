const JwtKey = require('../models/JwtKey');

class JwtKeyManager {
  static jwtSecret = null;
  static jwtRefreshSecret = null;
  static initialized = false;
  // Stores the in-flight init promise so concurrent requests share one call
  static _initPromise = null;

  /**
   * Inicializar las claves JWT desde la base de datos.
   * Thread-safe: concurrent calls reuse the same promise; subsequent calls
   * after successful init return immediately.
   */
  static async initialize() {
    // Already done — fast path
    if (this.initialized) return;

    // In-flight — reuse the existing promise instead of starting a new one
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        console.log('Inicializando claves JWT...');

        this.jwtSecret = process.env.JWT_SECRET || await JwtKey.getOrCreateKey('JWT_SECRET');
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || await JwtKey.getOrCreateKey('JWT_REFRESH_SECRET');

        this.initialized = true;
        console.log('Claves JWT inicializadas exitosamente');
      } catch (error) {
        console.error('Error inicializando claves JWT:', error);
        // Fallback so the server stays usable even if DB is temporarily unreachable
        this.jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-jwt-refresh-secret-key';
        this.initialized = true; // mark done so we don't retry on every request
        console.warn('Usando claves JWT de fallback');
      } finally {
        this._initPromise = null; // allow re-init if called again after reset
      }
    })();

    return this._initPromise;
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