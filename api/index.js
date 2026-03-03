

const app = require('../src/app');

// Agregar error handling global
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Handler para Vercel Serverless Functions
// Vercel espera que el export por default sea la app Express
module.exports = app;

// También exportar como default para máxima compatibilidad
module.exports.default = app;
