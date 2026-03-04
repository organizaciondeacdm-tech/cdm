import { defineConfig, devices } from '@playwright/test';

const appUrl = process.env.E2E_APP_URL || 'http://localhost:3000';
const apiUrl = process.env.E2E_API_URL || 'http://localhost:5000';
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
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
      command: 'node server.js',
      url: `${apiUrl}/health`,
      reuseExistingServer: true,
      timeout: 120 * 1000
    },
    {
      command: 'npm run dev:frontend -- --host 127.0.0.1',
      url: appUrl,
      reuseExistingServer: true,
      timeout: 120 * 1000
    }
  ]
});
