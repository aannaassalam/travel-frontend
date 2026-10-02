import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./evidence/test-results",
  timeout: 60_000,
  retries: 0,
  workers: 2,
  reporter: [["list"], ["json", { outputFile: "./evidence/results.json" }], ["html", { outputFolder: "./evidence/report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "api", testMatch: /api\..*\.spec\.ts/, use: { baseURL: "http://localhost:3001" } },
  ],
});
