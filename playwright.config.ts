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
        command: "npm run start",
        url: "http://localhost:3100/api/health",
        reuseExistingServer: false,
        env: {
          APP_BASE_URL: "http://localhost:3100",
          PORT: "3100",
          HOSTNAME: "127.0.0.1",
          REALTIME_MODE: "sse",
        },
      },
});
