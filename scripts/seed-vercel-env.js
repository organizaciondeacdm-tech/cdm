#!/usr/bin/env node
/**
 * seed-vercel-env.js
 * ─────────────────────────────────────────────────────────────────
 * Carga en la colección EnvironmentConfig de Atlas todas las
 * variables de entorno que Vercel necesita en producción.
 *
 * Uso:
 *   node scripts/seed-vercel-env.js
 *   npm run sync:vercel
 *
 * Solo requiere que MONGODB_URI esté disponible (en .env o como
 * variable de entorno del sistema). El resto de los valores están
 * hardcodeados aquí con sus secretos de producción.
 * ─────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const EnvironmentConfig = require('../src/models/EnvironmentConfig');

// ─── Variables de producción para Vercel ────────────────────────
// Editar aquí para actualizar cualquier secreto en Mongo.
const PROD_ENV = {
  NODE_ENV: 'production',

  // JWT
  JWT_SECRET: '?6A|(_;9%go&wr#18d4UQn(x}92dIr&fA3c8n[g6ul5bPVvr?D',
  JWT_REFRESH_SECRET: '926h^D5M^Rsgd;=@l(BPXn1*m8Q^IThql181C2cJ8a.7Oq4qv/',
  JWT_EXPIRE: '24h',
  JWT_REFRESH_EXPIRE: '7d',

  // Encriptación
  ENCRYPTION_KEY: 'LcV41GX3m&E80(U}eg0?@23d`3<5M*U/0Fv&I19F7?V{^q',
  BCRYPT_ROUNDS: '10',
  VITE_AUTH_STORAGE_SECRET: 'change-this-runtime-storage-secret',

  // CORS — incluye el dominio de Vercel
  CORS_ORIGIN: [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'https://cdm-ashy.vercel.app'
  ].join(','),

  // Seguridad
  MAX_LOGIN_ATTEMPTS: '5',
  LOGIN_LOCK_BASE_MINUTES: '15',
  LOGIN_LOCK_MAX_MINUTES: '240',
  LOGIN_RESPONSE_DELAY_MS: '400',
  RATE_LIMIT_WINDOW: '15',
  RATE_LIMIT_MAX: '100',

  // Email
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: '587',
  EMAIL_USER: 'your_email@gmail.com',
  EMAIL_PASSWORD: 'your_password',
  EMAIL_FROM: 'noreply@acdm.local',

  // Backup
  BACKUP_SCHEDULE: '0 2 * * *',
  BACKUP_RETENTION_DAYS: '30',
  BACKUP_PATH: '/tmp/backups'
};

// ─────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI no está definida. Agregala al .env local o como variable de entorno.');
  }

  console.log('Conectando a MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('Conectado.\n');

  let updated = 0;
  for (const [key, value] of Object.entries(PROD_ENV)) {
    await EnvironmentConfig.findOneAndUpdate(
      { key },
      {
        $set: {
          value: String(value),
          enabled: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          description: `Producción Vercel (${new Date().toISOString().split('T')[0]})`
        }
      },
      { upsert: true, new: true }
    );
    console.log(`  ✓ ${key}`);
    updated += 1;
  }

  console.log(`\n✅ ${updated} variables sincronizadas en MongoDB (colección EnvironmentConfig).`);
  console.log('   Vercel las cargará automáticamente en cada request via loadRuntimeEnvFromMongo().\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {
      // noop
    }
  });
