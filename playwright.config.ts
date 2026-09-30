import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false, // shared Mongo test DB - specs mutate shared state, keep runs serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  // Netlify Dev bundles each function lazily on its first invocation per
  // run (esbuild cold start), which can comfortably exceed Playwright's
  // 5s default on a page's first data fetch. 10s absorbs that without
  // masking genuine hangs, given the 30s overall test timeout above.
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8888',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
