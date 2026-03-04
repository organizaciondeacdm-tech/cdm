const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../config/auth');
const crypto = require('crypto');
const TryCatchDecorator = require('../utils/decorators');
const { Unauthorized, InternalServerError, BadRequest } = require('../utils/httpExceptions');

const LOGIN_RESPONSE_DELAY_MS = parseInt(process.env.LOGIN_RESPONSE_DELAY_MS, 10) || 400;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateTokens = (userId, rol) => {
  console.log('generateTokens called with:', { userId: userId.toString(), rol });

  try {
    console.log('Generating access token...');
    const accessToken = jwt.sign(
      { userId, rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    console.log('Access token generated successfully');

    let refreshToken = null;
    if (process.env.JWT_REFRESH_SECRET) {
      console.log('Generating refresh token with JWT_REFRESH_SECRET...');
      refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );
    } else {
      console.log('JWT_REFRESH_SECRET not found, using JWT_SECRET for refresh token...');
      refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE }
      );
    }
    console.log('Refresh token generated successfully');

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error in generateTokens:', error);
    throw error;
  }
};

const login = async (req, res) => {
  try {
    console.log('Login attempt started');
    const rawUsername = req.body?.username ?? req.body?.email ?? '';
    const username = String(rawUsername).trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    console.log('Parsed credentials:', { username, passwordLength: password.length });

    // Validar entrada
    if (!username || !password) {
      console.log('Validation failed: missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    console.log('Looking up user...');
    // Buscar usuario
    let user;
    try {
      user = await User.findOne({ 
        $or: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      });  // Mongoose maneja timeouts automáticamente
    } catch (dbError) {
      console.error('Database error during login:', dbError.message);
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(503).json({
        success: false,
        error: 'Base de datos no disponible. Intente más tarde.',
        retryAfter: 5
      });
    }

    console.log('User lookup result:', user ? 'found' : 'not found');
    if (!user) {
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    if (!user.isActive) {
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(403).json({
        success: false,
        error: 'Usuario inactivo'
      });
    }

    console.log('Checking if user is locked...');
    // Verificar si la cuenta está bloqueada
    if (user.isLocked()) {
      const lockMs = Math.max(0, user.lockUntil - new Date());
      const lockTime = Math.ceil(lockMs / 60000);
      const retryAfterSeconds = Math.max(1, Math.ceil(lockMs / 1000));

      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(423).json({
        success: false,
        error: `Cuenta bloqueada temporalmente. Intente nuevamente en ${lockTime} minutos`,
        retryAfterSeconds
      });
    }

    console.log('Comparing password...');
    // Verificar contraseña
    let isMatch;
    try {
      isMatch = await comparePassword(password, user.passwordHash);
    } catch (cryptoError) {
      console.error('Password comparison error:', cryptoError.message);
      await wait(LOGIN_RESPONSE_DELAY_MS);
      return res.status(500).json({
        success: false,
        error: 'Error al verificar credenciales'
      });
    }
    
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      const attemptResult = await user.registerFailedLoginAttempt();
      await wait(LOGIN_RESPONSE_DELAY_MS);

      if (attemptResult.locked && attemptResult.lockUntil) {
        const lockMs = Math.max(0, attemptResult.lockUntil - new Date());
        const lockTime = Math.ceil(lockMs / 60000);
        const retryAfterSeconds = Math.max(1, Math.ceil(lockMs / 1000));

        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(423).json({
          success: false,
          error: `Cuenta bloqueada temporalmente. Intente nuevamente en ${lockTime} minutos`,
          retryAfterSeconds
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        remainingAttempts: attemptResult.remainingAttempts
      });
    }

    console.log('Resetting login attempts...');
    // Resetear intentos fallidos
    const updateData = {
      loginAttempts: 0,
      lastLogin: new Date()
    };
    
    if (req.ip) {
      updateData.lastIP = req.ip;
    }
    
    await user.updateOne({
      $set: updateData,
      $unset: { lockUntil: 1 }
    });

    console.log('Generating tokens...');
    // Generar tokens
    try {
      var { accessToken, refreshToken } = generateTokens(user._id, user.rol);
      console.log('Tokens generated successfully, accessToken length:', accessToken ? accessToken.length : 'null');
    } catch (tokenError) {
      console.error('Error generating tokens:', tokenError);
      throw tokenError; // Re-throw to be caught by outer catch
    }

    // Guardar refresh token (temporalmente deshabilitado para debug)
    // try {
    //   const refreshTokenExpiry = new Date();
    //   refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

    //   user.refreshToken = {
    //     token: refreshToken,
    //     expiresAt: refreshTokenExpiry
    //   };
    //   await user.save();
    // } catch (saveError) {
    //   console.error('Error saving refresh token:', saveError.message);
    //   // No fallar el login por esto
    // }

    console.log('Login successful, sending response');
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.rol,
          permisos: user.permisos
        },
        tokens: {
          access: accessToken,
          refresh: refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      timestamp: new Date().toISOString()
    });

    // Proporcionar información de debug avanzada
    const debugInfo = {
      message: error.message,
      name: error.name,
      code: error.code,
      timestamp: new Date().toISOString(),
      // Incluir stack trace siempre para debugging
      stack: error.stack,
      // Información adicional del error
      details: {
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        // Agregar información del entorno
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'unknown',
        // Verificar si las variables de entorno críticas están definidas
        jwtSecretDefined: !!process.env.JWT_SECRET,
        jwtRefreshSecretDefined: !!process.env.JWT_REFRESH_SECRET,
        mongoUriDefined: !!process.env.MONGODB_URI
      }
    };

    const internalError = new InternalServerError(
      'Error en el servidor',
      debugInfo
    );

    res.status(internalError.statusCode).json(internalError.toJSON());
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token requerido'
      });
    }

    // Verificar refresh token
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(refreshToken, secret);
    
    const user = await User.findOne({
      _id: decoded.userId,
      'refreshToken.token': refreshToken,
      'refreshToken.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token inválido o expirado'
      });
    }

    // Generar nuevos tokens
    const tokens = generateTokens(user._id, user.rol);

    // Actualizar refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

    user.refreshToken = {
      token: tokens.refreshToken,
      expiresAt: refreshTokenExpiry
    };
    await user.save();

    res.json({
      success: true,
      data: {
        tokens
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Refresh token inválido'
    });
  }
};

const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.refreshToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesión'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verificar contraseña actual
    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Actualizar contraseña
    user.passwordHash = newPassword;
    await user.save();

    // Invalidar refresh tokens
    user.refreshToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al cambiar contraseña'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -refreshToken')
      .populate('createdBy', 'username email');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil'
    });
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  changePassword,
  getProfile
};
