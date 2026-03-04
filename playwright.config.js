import { defineConfig, devices } from '@playwright/test';

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
    baseURL: process.env.E2E_APP_URL || 'http://localhost:3000',
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
  webServer: [
    {
      command: 'npm run dev',
      url: process.env.E2E_API_URL ? `${process.env.E2E_API_URL}/health` : 'http://localhost:5000/health',
      reuseExistingServer: true,
      timeout: 120 * 1000
    },
    {
      command: 'npm run dev:frontend',
      url: process.env.E2E_APP_URL || 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120 * 1000
    }
  ]
});
