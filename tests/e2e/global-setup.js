require('dotenv').config();
const { request } = require('@playwright/test');
const connectDB = require('../../src/config/database');
const User = require('../../src/models/User');
const RolePolicy = require('../../src/models/RolePolicy');
const AuthThrottle = require('../../src/models/AuthThrottle');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureHealth = async (apiUrl) => {
  const ctx = await request.newContext({ baseURL: apiUrl });
  try {
    let lastStatus = null;
    for (let i = 0; i < 15; i += 1) {
      const res = await ctx.get('/health').catch(() => null);
      const status = res?.status?.() || null;
      lastStatus = status;
      if (status === 200) return;
      await sleep(1000);
    }
    throw new Error(`Health check no disponible. Último status: ${lastStatus}`);
  } finally {
    await ctx.dispose();
  }
};

const ensureE2EUser = async () => {
  const username = String(process.env.E2E_USERNAME || process.env.E2E_USER || 'papiweb').trim().toLowerCase();
  const password = String(process.env.E2E_PASSWORD || process.env.E2E_PASS || 'admin2025');
  const email = `${username}@acdm.local`;

  await RolePolicy.ensureDefaults();
  await RolePolicy.updateOne(
    { $or: [{ roleLookup: RolePolicy.getRoleLookup('admin') }, { role: 'admin' }] },
    { $set: { role: 'admin', defaultPermissions: ['*'] } },
    { upsert: true }
  );

  let user = await User.findOne({ username });
  if (!user) {
    user = await User.create({
      username,
      email,
      nombre: 'E2E',
      apellido: 'Admin',
      rol: 'admin',
      permisos: ['*'],
      passwordHash: password,
      isActive: true,
      loginAttempts: 0,
      lockUntil: null
    });
  } else {
    user.email = user.email || email;
    user.nombre = user.nombre || 'E2E';
    user.apellido = user.apellido || 'Admin';
    user.rol = 'admin';
    user.permisos = ['*'];
    user.isActive = true;
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.passwordHash = password;
    await user.save();
  }

  await AuthThrottle.deleteMany({
    $or: [
      { key: { $regex: '^login:' } },
      { key: { $regex: '^unknownip:' } }
    ]
  });

  process.env.E2E_USERNAME = username;
  process.env.E2E_PASSWORD = password;
};

const { deobfuscate } = require('../../src/utils/envObfuscator');

module.exports = async () => {
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:5000';

  // Ensure we decrypt MONGODB_URI if it's encrypted so TypeORM can connect during tests
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('ENC:')) {
    process.env.MONGODB_URI = deobfuscate(process.env.MONGODB_URI);
  }

  await ensureHealth(apiUrl);
  await connectDB();
  await ensureE2EUser();
  console.log(`[global-setup] E2E user ready: ${process.env.E2E_USERNAME}`);
};
