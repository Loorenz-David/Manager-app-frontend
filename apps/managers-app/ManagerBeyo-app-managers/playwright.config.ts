import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/playwright',

  fullyParallel: true,

  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['html'],
  ],

  use: {
    baseURL: 'http://localhost:5173',

    trace: 'on-first-retry',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'mobile-chrome',

      use: {
        ...devices['Pixel 7'],
      },
    },

    {
      name: 'desktop-chrome',

      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev',

    url: 'http://localhost:5173',

    reuseExistingServer: true,

    timeout: 120 * 1000,
  },
})