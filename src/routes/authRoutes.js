const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { 
  login, 
  refreshToken, 
  logout, 
  changePassword,
  getProfile 
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

const loginLimiter = rateLimit({
  windowMs: (parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiados intentos de inicio de sesión. Intente nuevamente más tarde.'
  }
});

router.post('/login', loginLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authMiddleware, logout);
router.post('/change-password', authMiddleware, changePassword);
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
