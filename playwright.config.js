import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

const appUrl = process.env.E2E_APP_URL || 'http://localhost:3000';
const apiUrl = process.env.E2E_API_URL || 'http://localhost:5000';
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === '1';
const e2eDir = fs.existsSync('./tests/e2e') ? './tests/e2e' : '.';
const globalSetupPath = './tests/e2e/global-setup.js';
const hasGlobalSetup = fs.existsSync(globalSetupPath);

export default defineConfig({
  globalSetup: hasGlobalSetup ? globalSetupPath : undefined,
  testDir: e2eDir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  use: {
    baseURL: appUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: skipWebServer ? undefined : [
    {
      command: 'E2E_DISABLE_RATE_LIMIT=1 node server.js',
      url: `${apiUrl}/health`,
      reuseExistingServer: true,
      timeout: 120 * 1000,
      env: {
        E2E_DISABLE_RATE_LIMIT: '1'
      }
    },
    {
      command: 'npm run dev:frontend -- --host 127.0.0.1',
      url: appUrl,
      reuseExistingServer: true,
      timeout: 120 * 1000
    }
  ]
});
