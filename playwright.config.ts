import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const AUTH_FILE = '.auth/rnd.ja.json';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,               // one shared staging account -> run sequentially
  retries: 0,               // a retry can hide a real formatting defect
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    screenshot: 'on',
    video: 'off',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', storageState: AUTH_FILE },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge', storageState: AUTH_FILE },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
