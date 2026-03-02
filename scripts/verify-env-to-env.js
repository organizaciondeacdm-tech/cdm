const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateEnv } = require('../src/config/env');

function parseEnvFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const idx = clean.indexOf('=');
    if (idx === -1) continue;
    env[clean.slice(0, idx)] = clean.slice(idx + 1);
  }
  return env;
}

function runStep(title, cmd, args) {
  process.stdout.write(`\n[STEP] ${title}\n`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const root = process.cwd();
const files = [
  '.env.development.example',
  '.env.staging.example',
  '.env.production.example'
];

for (const file of files) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing env template file: ${file}`);
  }

  const config = validateEnv(parseEnvFile(fullPath));
  process.stdout.write(`[ENV OK] ${file} -> ${config.nodeEnv}\n`);
}

runStep('Environment matrix tests', 'node', ['--test', 'tests/env.matrix.test.js']);
runStep('Domain and resilience tests', 'node', ['--test', 'tests/form-engine.service.test.js', 'tests/batch-queue.test.js']);
runStep('Frontend production build', 'npm', ['run', 'build']);

process.stdout.write('\n[COMPLETE] Env-to-env incremental verification passed.\n');
