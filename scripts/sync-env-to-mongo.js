#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const EnvironmentConfig = require('../src/models/EnvironmentConfig');
const { isAllowedRuntimeEnvKey } = require('../src/config/envKeys');

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI no está definida');
  }

  await mongoose.connect(mongoUri);

  const candidates = Object.entries(process.env)
    .filter(([key, value]) => /^[A-Z0-9_]+$/.test(key) && value !== undefined && isAllowedRuntimeEnvKey(key));

  let updated = 0;
  for (const [key, value] of candidates) {
    await EnvironmentConfig.findOneAndUpdate(
      { key },
      {
        $set: {
          value: String(value),
          enabled: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          description: 'Sincronizado desde process.env'
        }
      },
      { upsert: true, new: true }
    );
    updated += 1;
  }

  console.log(`Sincronización completa. Variables aplicadas en MongoDB: ${updated}`);
}

main()
  .catch((error) => {
    console.error('Error sincronizando env a MongoDB:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (error) {
      // noop
    }
  });
