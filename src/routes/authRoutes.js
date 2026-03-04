const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  login, 
  refreshToken, 
  logout, 
  changePassword,
  getProfile,
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  getAllActiveSessions,
  revokeSessionByAdmin,
  getWatchedIpLog
} = require('../controllers/authController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.E2E_DISABLE_RATE_LIMIT === '1';
const authAntiBotGuard = (req, res, next) => {
  if (isTestEnv) return next();

  const ua = String(req.headers['user-agent'] || '').trim();
  const honeypot = req.body?.website || req.body?.url || req.body?.botField;

  if (!ua || ua.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Solicitud bloqueada por validación anti-bot'
    });
  }

  if (honeypot) {
    return res.status(400).json({
      success: false,
      error: 'Solicitud bloqueada por validación anti-bot'
    });
  }

  next();
};

const loginLimiter = rateLimit({
  windowMs: (parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  max: isTestEnv ? 10_000 : (parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos de inicio de sesión. Intente nuevamente más tarde.'
  },
  skip: () => isTestEnv
});

const refreshLimiter = rateLimit({
  windowMs: (parseInt(process.env.REFRESH_RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  max: isTestEnv ? 10_000 : (parseInt(process.env.REFRESH_RATE_LIMIT_MAX, 10) || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos de renovación de token. Intente nuevamente más tarde.'
  },
  skip: () => isTestEnv
});

router.post('/login', authAntiBotGuard, loginLimiter, login);
router.post('/refresh-token', authAntiBotGuard, refreshLimiter, refreshToken);
router.post('/logout', authMiddleware, logout);
router.post('/change-password', authMiddleware, changePassword);
router.get('/profile', authMiddleware, getProfile);

// Rutas de gestión de sesiones
router.get('/sessions', authMiddleware, getActiveSessions);
router.delete('/sessions/:sessionId', authMiddleware, revokeSession);
router.delete('/sessions', authMiddleware, revokeAllSessions);

// Rutas de administración de sesiones (solo rol privilegiado)
router.get('/admin/sessions', authMiddleware, requireAdmin, getAllActiveSessions);
router.delete('/admin/sessions/:sessionId', authMiddleware, requireAdmin, revokeSessionByAdmin);

// Log de IPs para usuarios vigilados (solo rol privilegiado)
router.get('/admin/watch-log', authMiddleware, requireAdmin, getWatchedIpLog);

module.exports = router;
