import { defineConfig, devices } from "@playwright/test";

/**
 * Visual-regression config for the QuantEcon report theme.
 *
 * Like the lecture theme this scaffold came from, the theme is a runtime Remix
 * server rather than static HTML, so tests run against a live `myst start` of
 * the fixture in `tests/visual/fixture`, with the theme under test selected via
 * the `THEME_TEMPLATE` env var (see `tests/visual/serve.sh` and the README):
 *
 *   make build-theme
 *   THEME_TEMPLATE="$PWD/.deploy/quantecon-theme-report" npm run test:visual
 *
 * Phase 0 note: `theme.spec.ts` asserts structure, not pixels — there is no
 * report UI to baseline yet. The pixel snapshots (and the committed
 * platform-suffixed baselines the `snapshotPathTemplate` below anticipates)
 * arrive with the Phase 3 harness, #9.
 */
const PORT = process.env.PORT || "3111";
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    // results.json feeds the PR summary comment in the `visual` CI job.
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  // Baselines are platform-suffixed (…-darwin, …-linux): font antialiasing
  // differs across OSes, so local macOS runs and ubuntu CI each diff against
  // pixels rendered on their own platform. CI baselines are refreshed by
  // commenting /update-snapshots on a PR (.github/workflows/update-snapshots.yml).
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}-{platform}/{arg}{ext}",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    // Rendering assertions run on Chromium (theme.spec.ts).
    {
      name: "desktop-chrome",
      testMatch: /theme\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-chrome",
      testMatch: /theme\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    // FOUC guard runs on WebKit only — Chromium paint-holds and can't show the
    // flash (fouc.spec.ts).
    {
      name: "webkit-fouc",
      testMatch: /fouc\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: [
    {
      command: "bash tests/visual/serve.sh",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 300 * 1000,
    },
  ],
});
