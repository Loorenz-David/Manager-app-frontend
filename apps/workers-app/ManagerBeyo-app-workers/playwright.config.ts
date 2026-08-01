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

  // Every spec signs in as the same account, and four of them mutate the same
  // worker's task steps (pause-reason, working-sections, reassigned-steps,
  // reassignment-acknowledgments). Run in parallel they fight: one test pauses
  // the step while another resumes it, and assertions read a state the app is
  // right about but the test is not. Observed directly — two specs captured the
  // same step three seconds apart showing "Pause" and "Resume".
  //
  // `fullyParallel: false` alone would not fix it: that only serialises tests
  // *within* a file, and the conflicting specs live in different files. One
  // worker is the lever.
  //
  // Cost is ~40s → ~1.5m per project at this suite size. Revisit by giving each
  // worker its own account (and its own sections/steps/reassignments) if that
  // wait becomes the bottleneck.
  fullyParallel: false,

  workers: 1,

  // Was 2 in CI. With a shared account that masked the interference above —
  // a collision would retry and pass, so CI reported green on a racy suite.
  // Keep one retry for genuine network flake, not enough to hide a pattern.
  retries: process.env.CI ? 1 : 0,

  reporter: [["html"], ["line"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5174",

    serviceWorkers: "block",

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
