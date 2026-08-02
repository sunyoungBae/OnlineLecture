import { defineConfig, devices } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";

const e2eDirectory = "./tests/e2e";
const hasE2ETests =
  existsSync(e2eDirectory) &&
  readdirSync(e2eDirectory, { recursive: true }).some((file) =>
    /\.(spec|test)\.[cm]?[jt]sx?$/.test(file.toString()),
  );

export default defineConfig({
  testDir: e2eDirectory,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: hasE2ETests
    ? {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
