import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.BROWSER_BASE_URL ?? "http://localhost:3100",
    headless: true,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: process.env.BROWSER_BASE_URL
    ? undefined
    : {
        command: "npm run start -- --port 3100",
        url: "http://localhost:3100/api/health",
        reuseExistingServer: false,
        env: { APP_BASE_URL: "http://localhost:3100", REALTIME_MODE: "sse" },
      },
});
