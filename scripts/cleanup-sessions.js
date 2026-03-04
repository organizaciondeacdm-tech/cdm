#!/usr/bin/env node

/**
 * Script para limpiar sesiones expiradas
 * Se puede ejecutar manualmente o programar con cron
 */

const mongoose = require('mongoose');
require('dotenv').config();

const SessionService = require('../src/services/sessionService');

async function cleanupSessions() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Limpiando sesiones expiradas...');
    const result = await SessionService.cleanupExpiredSessions();

    console.log(`Sesiones expiradas limpiadas: ${result.modifiedCount || 0}`);

    // Obtener estadísticas
    const Session = require('../src/models/Session');
    const activeSessions = await Session.countDocuments({ isActive: true });
    const totalSessions = await Session.countDocuments();

    console.log(`Sesiones activas: ${activeSessions}`);
    console.log(`Total de sesiones: ${totalSessions}`);

  } catch (error) {
    console.error('Error limpiando sesiones:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanupSessions();
}

module.exports = cleanupSessions;