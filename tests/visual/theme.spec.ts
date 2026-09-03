import { test, expect } from "@playwright/test";

/**
 * Rendering smoke tests against the placeholder fixture.
 *
 * Phase 0 has no report UI to baseline: the app renders article content in the
 * centred grid and nothing else. Pixel snapshots would therefore lock in an
 * empty page and would have to be thrown away in Phase 2 (#6) anyway, so this
 * suite asserts **structure** — that the theme built from this branch serves
 * the fixture, renders its content, and puts the grid and skip target where the
 * critical CSS and the shell expect them.
 *
 * The `desktop-chrome` / `mobile-chrome` projects, the platform-suffixed
 * `snapshotPathTemplate` and the `/update-snapshots` workflow are all in place;
 * the Phase 3 harness (#9) adds `toHaveScreenshot` assertions here and seeds the
 * committed baselines.
 */

test.describe("report theme renders the fixture", () => {
  test("landing page", async ({ page }) => {
    await page.goto("/");

    // Content came through the MyST content server and was rendered.
    await expect(page.getByRole("heading", { name: "Compliance report fixture" })).toBeVisible();
    await expect(page.locator("main").getByText("placeholder report fixture")).toBeVisible();

    // The layout hooks the critical CSS and the Phase 2 shell rely on. Scoped to
    // the page container: `@myst-theme/site`'s Footnotes section reuses
    // `.simple-center-grid`, so an unscoped locator matches more than one.
    const grid = page.locator("main > .simple-center-grid");
    await expect(grid).toHaveCount(1);
    await expect(page.locator("#skip-to-article")).toHaveCount(1);

    // The grid is really a grid once the real stylesheet has applied.
    await expect(grid).toHaveCSS("display", "grid");
  });

  test("a second page resolves through the catch-all route", async ({ page }) => {
    await page.goto("/series");

    await expect(page.getByRole("heading", { name: "A series page" })).toBeVisible();
    await expect(page.locator("main > .simple-center-grid")).toHaveCount(1);
  });
});
