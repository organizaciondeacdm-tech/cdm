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
        const strictEnv = !['development', 'test'].includes(String(process.env.NODE_ENV || '').toLowerCase());

        this.jwtSecret = process.env.JWT_SECRET || await JwtKey.getOrCreateKey('JWT_SECRET');
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || await JwtKey.getOrCreateKey('JWT_REFRESH_SECRET');

        this.initialized = true;
        console.log('Claves JWT inicializadas exitosamente');
      } catch (error) {
        console.error('Error inicializando claves JWT:', error);
        const strictEnv = !['development', 'test'].includes(String(process.env.NODE_ENV || '').toLowerCase());
        if (strictEnv) {
          this.initialized = false;
          throw new Error('No se pudieron inicializar claves JWT en entorno estricto');
        }
        this.jwtSecret = process.env.JWT_SECRET || 'dev-only-jwt-secret';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-only-jwt-refresh-secret';
        this.initialized = true;
        console.warn('Usando claves JWT de fallback solo para desarrollo/test');
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
