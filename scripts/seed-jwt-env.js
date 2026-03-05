#!/usr/bin/env node
/**
 * Seeds JWT_EXPIRE and JWT_REFRESH_EXPIRE into the environment_configs
 * collection so loadRuntimeEnvFromMongo picks them up at server start.
 */
require('dotenv').config();
const { initializeDataSource } = require('../src/config/typeorm');

const VARS = [
  { key: 'JWT_EXPIRE',         value: '15m', description: 'Access token expiry' },
  { key: 'JWT_REFRESH_EXPIRE', value: '7d',  description: 'Refresh token expiry' },
];

async function run() {
  const ds = await initializeDataSource();
  const client = ds.driver.queryRunner.databaseConnection;
  const db = client.db(ds.driver.database);
  const col = db.collection('environment_configs');
  const now = new Date();

  for (const v of VARS) {
    const exists = await col.findOne({ key: v.key });
    if (!exists) {
      await col.insertOne({ key: v.key, value: v.value, description: v.description, enabled: true, createdAt: now, updatedAt: now });
      console.log(`✅ Inserted: ${v.key} = ${v.value}`);
    } else {
      console.log(`ℹ️  Already exists: ${v.key} = ${exists.value}`);
    }
  }
  process.exit(0);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
