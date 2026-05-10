import { defineConfig, devices } from "@playwright/test";

const TEST_PORT = 3002;
const MOCK_PORT = 3099;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // Mock backend — puerto 3099 aislado del backend real (3001)
      command: "node scripts/mock-backend.cjs",
      url: `http://localhost:${MOCK_PORT}/api/v1/business/me`,
      reuseExistingServer: false,
      timeout: 15000,
    },
    {
      // Frontend de test — puerto 3002 aislado del dev (3000)
      command: "npx next dev -H 0.0.0.0 -p 3002",
      url: `http://localhost:${TEST_PORT}/login`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXTAUTH_URL: `http://localhost:${TEST_PORT}`,
        NEXTAUTH_SECRET: "local_dev_secret_key_with_more_than_32_chars_67890",
        BACKEND_URL: `http://localhost:${MOCK_PORT}`,
        NEXT_PUBLIC_BACKEND_URL: `http://localhost:${MOCK_PORT}`,
      },
    },
  ],
});
