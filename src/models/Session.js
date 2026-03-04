const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true,
    unique: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    platform: String,
    browser: String,
    os: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  refreshExpiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejor rendimiento
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ accessToken: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ lastActivity: 1 });

// Método para actualizar actividad
sessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Método para invalidar sesión
sessionSchema.methods.invalidate = function() {
  this.isActive = false;
  return this.save();
};

// Método estático para limpiar sesiones expiradas
sessionSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      $or: [
        { expiresAt: { $lt: now } },
        { refreshExpiresAt: { $lt: now } }
      ]
    },
    { isActive: false }
  );
  console.log(`Sesiones expiradas limpiadas: ${result.modifiedCount}`);
  return result;
};

// Método estático para obtener sesiones activas de un usuario
sessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Método estático para validar token de acceso
sessionSchema.statics.validateAccessToken = async function(accessToken) {
  const session = await this.findOne({
    accessToken,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'username email rol permisos isActive');

  if (!session) return null;

  // Actualizar última actividad
  await session.updateActivity();

  return session;
};

// Método estático para validar token de refresh
sessionSchema.statics.validateRefreshToken = async function(refreshToken) {
  return this.findOne({
    refreshToken,
    isActive: true,
    refreshExpiresAt: { $gt: new Date() }
  }).populate('userId', 'username email rol permisos isActive');
};

// Método estático para revocar todas las sesiones de un usuario
sessionSchema.statics.revokeAllUserSessions = function(userId) {
  return this.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};

// Método estático para revocar sesión específica (con verificación opcional de usuario)
sessionSchema.statics.revokeSession = function(sessionId, userId = null) {
  const query = userId ? { _id: sessionId, userId } : { _id: sessionId };
  return this.findOneAndUpdate(query, { isActive: false });
};

// Método estático para revocar todas las sesiones de un usuario (excepto la actual)
sessionSchema.statics.revokeAllSessions = function(userId, currentSessionId = null) {
  const query = currentSessionId 
    ? { userId, isActive: true, _id: { $ne: currentSessionId } }
    : { userId, isActive: true };
  
  return this.updateMany(query, { isActive: false });
};

module.exports = mongoose.model('Session', sessionSchema);