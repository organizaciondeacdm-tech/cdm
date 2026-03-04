const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SessionService = require('../services/sessionService');
const JwtKeyManager = require('../utils/jwtKeyManager');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido'
      });
    }

    // Validar token usando SessionService
    const session = await SessionService.validateAccessToken(token);

    if (!session || !session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o sesión expirada'
      });
    }

    req.user = session.userId; // El populate ya trae el usuario completo
    // Endurece shape del usuario para evitar fallas en chequeos de permisos.
    req.user.permisos = Array.isArray(req.user?.permisos) ? req.user.permisos : [];
    req.user.rol = String(req.user?.rol || '');
    req.token = token;
    req.session = session;
    req.sessionId = session._id; // Agregar sessionId para gestión de sesiones
    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error);
    res.status(401).json({
      success: false,
      error: 'Por favor autentíquese'
    });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Usuario no autenticado' 
        });
      }

      const role = String(req.user?.rol || '');
      const permisos = Array.isArray(req.user?.permisos) ? req.user.permisos : [];
      const permisosSet = new Set(permisos.map((p) => String(p)));
      if (role === 'admin' || permisosSet.has('*') || permisosSet.has(String(permission))) {
        return next();
      }

      return res.status(403).json({ 
        success: false,
        error: 'No tiene permisos para realizar esta acción' 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error al validar permisos'
      });
    }
  };
};

const requireAdmin = (req, res, next) => {
  if (req.user?.rol === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      error: 'Se requieren permisos de administrador' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ 
        _id: decoded.userId,
        isActive: true 
      });
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignorar errores de autenticación opcional
  }
  next();
};

module.exports = {
  authMiddleware,
  requirePermission,
  requireAdmin,
  optionalAuth
};
