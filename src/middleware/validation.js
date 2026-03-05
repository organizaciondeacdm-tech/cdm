const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

const validateEscuela = [
  body('de')
    .optional({ checkFalsy: true })
    .matches(/^DE\s\d{2}$/)
    .withMessage('DE debe tener formato DE 01'),
  body('escuela')
    .if((value, { req }) => req.method === 'POST' || value !== undefined)
    .notEmpty()
    .trim()
    .withMessage('Nombre de escuela es requerido'),
  body('nivel')
    .optional({ checkFalsy: true })
    .isIn(['Inicial', 'Primario', 'Secundario', 'Especial', 'Técnica', 'Adultos'])
    .withMessage('Nivel inválido'),
  body('direccion')
    .if((value, { req }) => req.method === 'POST' || value !== undefined)
    .notEmpty()
    .withMessage('Dirección es requerida'),
  body('localidad')
    .optional({ checkFalsy: true }),
  body()
    .custom((_, { req }) => {
      const email = req.body.email || req.body.mail;
      if (!email && req.method === 'POST') {
        throw new Error('Email inválido');
      }
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (email && !emailRegex.test(email)) {
        throw new Error('Email inválido');
      }
      return true;
    }),
  body('jornada')
    .optional({ checkFalsy: true })
    .isIn(['Simple', 'Completa', 'Extendida', 'Doble Escolaridad'])
    .withMessage('Jornada inválida'),
  body('turno')
    .optional({ checkFalsy: true })
    .isIn(['Mañana', 'Tarde', 'Vespertino', 'Noche', 'Completo'])
    .withMessage('Turno inválido'),
  handleValidationErrors
];

const validateDocente = [
  body('nombre')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1 })
    .withMessage('Nombre es requerido'),
  body('apellido')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1 })
    .withMessage('Apellido es requerido'),
  body('dni')
    .optional({ checkFalsy: true })
    .matches(/^\d{7,8}$/)
    .withMessage('DNI debe tener 7 u 8 dígitos'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('fechaNacimiento')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('cargo')
    .optional({ checkFalsy: true })
    .isIn([
      'Titular', 'Suplente', 'Interino', 'Provisorio',
      'Maestro de Grado', 'Maestro de Educación Especial',
      'Maestro de Educación Inicial', 'Profesor', 'Directivo',
      'Vice-director', 'Secretario', 'Auxiliar'
    ])
    .withMessage('Cargo inválido'),
  handleValidationErrors
];

const validateAlumno = [
  body('nombre')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1 })
    .withMessage('Nombre es requerido'),
  body('apellido')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1 })
    .withMessage('Apellido es requerido'),
  body('dni')
    .optional({ checkFalsy: true })
    .matches(/^\d{7,8}$/)
    .withMessage('DNI debe tener 7 u 8 dígitos'),
  body('fechaNacimiento')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('gradoSalaAnio')
    .optional({ checkFalsy: true }),
  body('diagnostico')
    .optional({ checkFalsy: true }),
  handleValidationErrors
];

const validateUser = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username solo puede contener letras, números y _'),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'),
  body('nombre')
    .notEmpty()
    .trim()
    .withMessage('Nombre es requerido'),
  body('apellido')
    .notEmpty()
    .trim()
    .withMessage('Apellido es requerido'),
  handleValidationErrors
];

module.exports = {
  validateEscuela,
  validateDocente,
  validateAlumno,
  validateUser
};
