import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests run against a production build, because the service worker
 * only behaves like production there.
 *
 * Mobile uses the iPhone 14 profile (viewport, touch, user agent). By default
 * it runs on Chromium so it works wherever only Chromium is installed; set
 * PW_WEBKIT=1 to run the same profile on real WebKit.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["iPhone 14"],
        ...(process.env.PW_WEBKIT ? {} : { browserName: "chromium" as const }),
      },
    },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/styleguide`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
