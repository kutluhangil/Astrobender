import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    colorScheme: 'dark',
    locale: 'tr-TR',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /pwa-offline\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-pwa-build',
      testMatch: /pwa-offline\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4180' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4180 --strictPort',
      url: 'http://127.0.0.1:4180',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
