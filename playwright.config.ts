import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  reporter: "list",
  outputDir: process.env.UI_ARTIFACT_DIR
    ? `${process.env.UI_ARTIFACT_DIR}/test-results`
    : "test-results",
  use: {
    baseURL: "http://127.0.0.1:4173/may-contain/",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/may-contain/",
    reuseExistingServer: !process.env.CI,
  },
});
