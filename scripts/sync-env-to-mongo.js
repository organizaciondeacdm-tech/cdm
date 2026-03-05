#!/usr/bin/env node

require('dotenv').config();
const connectDB = require('../src/config/database');
const EnvironmentConfig = require('../src/models/EnvironmentConfig');
const { isAllowedRuntimeEnvKey } = require('../src/config/envKeys');
const { getMongoUri } = require('../src/utils/envObfuscator');

async function main() {
  await connectDB();

  const candidates = Object.entries(process.env)
    .filter(([key, value]) => /^[A-Z0-9_]+$/.test(key) && value !== undefined && isAllowedRuntimeEnvKey(key));

  let updated = 0;
  for (const [key, value] of candidates) {
    await EnvironmentConfig.updateOne(
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
      { upsert: true }
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
  .finally(() => {
    process.exit(0);
  });
