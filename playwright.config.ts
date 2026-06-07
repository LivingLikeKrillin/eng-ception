import { defineConfig, devices } from '@playwright/test'

// E2E runs against the Vite dev server in mock mode (VITE_USE_MOCK=true from .env.local),
// so no Claude API key / api proxy is needed. A dedicated strict port avoids colliding
// with other dev servers that squat on 5173+.
const PORT = 5219
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
