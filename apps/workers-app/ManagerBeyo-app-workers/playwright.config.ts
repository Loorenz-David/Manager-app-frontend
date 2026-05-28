import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(filename: string) {
  try {
    const lines = readFileSync(resolve(process.cwd(), filename), "utf-8").split(
      "\n",
    );
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const raw = trimmed.slice(eq + 1).trim();
      const value = raw.replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch {
    // File absent — continue to next env source.
  }
}

// Explicitly parse Playwright env files before any test module is evaluated.
// Uses process.cwd() (the directory npm was invoked from) — __dirname is
// unavailable in ESM packages ("type": "module").
loadEnvFile(".env.test");
loadEnvFile(".env");

export default defineConfig({
  testDir: "./tests/playwright",

  fullyParallel: true,

  retries: process.env.CI ? 2 : 0,

  reporter: [["html"], ["line"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5174",

    trace: "on-first-retry",

    screenshot: "only-on-failure",

    video: "retain-on-failure",
  },

  projects: [
    {
      name: "mobile",

      use: {
        ...devices["iPhone 14 Pro"],
      },
    },

    {
      name: "desktop",

      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",

    url: "http://localhost:5174",

    cwd: process.cwd(),

    reuseExistingServer: false,

    timeout: 120 * 1000,
  },
});
