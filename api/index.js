
const app = require('../src/app');

// Handler para Vercel Serverless Functions
module.exports = app;

// Exportar como handler explícito si es necesario
module.exports.default = app;
