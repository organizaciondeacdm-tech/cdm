const EnvironmentConfig = require('../models/EnvironmentConfig');
const { isAllowedRuntimeEnvKey } = require('./envKeys');

let loaded = false;
let lastLoadedAt = null;

async function loadRuntimeEnvFromMongo(options = {}) {
  const { override = true, logger = console } = options;

  const entries = await EnvironmentConfig.getEnabledConfig();

  let applied = 0;
  entries.forEach((item) => {
    if (!item?.key) return;
    if (!isAllowedRuntimeEnvKey(item.key)) return;
    if (!override && process.env[item.key] !== undefined) return;
    process.env[item.key] = String(item.value ?? '');
    applied += 1;
  });

  loaded = true;
  lastLoadedAt = new Date();
  logger.info(`Runtime env loaded from MongoDB (${applied} variables applied)`);

  return {
    applied,
    loaded,
    lastLoadedAt
  };
}

function getRuntimeEnvState() {
  return { loaded, lastLoadedAt };
}

module.exports = {
  loadRuntimeEnvFromMongo,
  getRuntimeEnvState
};
