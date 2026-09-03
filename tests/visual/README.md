# Rendering and visual-regression tests

Playwright tests for the QuantEcon report theme, carried across from the lecture
theme's harness. The theme is a **runtime Remix server** rather than static HTML,
so the tests render a small fixture project (`fixture/`) through a live
`myst start`, with the **theme under test** chosen at run time.

## Phase 0 status

There is no report UI to baseline yet: `app/` renders article content in the
centred grid and nothing else. So `theme.spec.ts` asserts **structure** — the
fixture is served, its content renders, and the grid and skip target are where
the critical CSS and the Phase 2 shell expect them — rather than pixels. The
screenshot assertions and the committed baselines land with the Phase 3 harness
([#9](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/9)). The
platform-suffixed `snapshotPathTemplate`, the `desktop-chrome`/`mobile-chrome`
projects and the `/update-snapshots` workflow are already in place for it.

## Prerequisites

- Node 24 (`.nvmrc`) and the `mystmd` CLI (`myst`) on `PATH`
- `npm ci`
- `npx playwright install --with-deps chromium webkit` (browser binaries —
  `chromium` for the rendering suite, `webkit` for the FOUC guard below)

## Selecting the theme: `THEME_TEMPLATE`

`serve.sh` injects `THEME_TEMPLATE` as the fixture's `site.template`. It accepts
either a local theme **build directory** or a release **zip URL**.

| Target | `THEME_TEMPLATE` |
| ------ | ---------------- |
| **This repo (current candidate)** | a local build dir — `make build-theme` then `$PWD/.deploy/quantecon-theme-report` |
| **A released bundle** | the pinned release-asset URL — `https://github.com/QuantEcon/quantecon-theme-report.mystmd/releases/download/vX.Y.Z/quantecon-theme-report.zip` |

```bash
make build-theme
THEME_TEMPLATE="$PWD/.deploy/quantecon-theme-report" npm run test:visual
```

## Baselines (from Phase 3 on)

Committed `__snapshots__/` baselines are **platform-suffixed** — font
antialiasing differs across OSes, so each platform diffs against pixels it
rendered itself:

- `…-darwin/` — for local runs on macOS (`npm run test:visual`)
- `…-linux/` — what the `visual` CI job compares against on every PR

Refresh `-darwin` locally with `npm run test:visual:update`; refresh `-linux` by
commenting **`/update-snapshots`** on the PR (re-captures all CI baselines — use
when a visual change is intentional) or **`/update-new-snapshots`** (only writes
missing ones — safe when adding tests, and how the very first baselines get
seeded). The workflow pushes the refreshed baselines to the PR branch (same-repo
branches only, not forks).

## FOUC guard (WebKit)

`fouc.spec.ts` guards the Safari/WebKit flash-of-unstyled-content fix: it aborts
all external stylesheets so the only styling that can reach the first paint is
the inline critical CSS in `app/root.tsx`, then asserts the layout and font are
already correct (a control case proves the abort really strips styling). It is
**snapshot-free** (asserts computed `display`/`font-family`, not pixels), so it
is robust across `myst`/CI versions. It runs on the `webkit-fouc` project only —
Chromium paint-holds and cannot exhibit the flash — and is wired into CI as the
`FOUC guard (WebKit)` job.

```bash
make build-theme
THEME_TEMPLATE="$PWD/.deploy/quantecon-theme-report" npm run test:fouc
```

## Files

- `fixture/` — placeholder MyST project (`intro.md`, `series.md`), prose only.
  Phase 3 replaces it with the sample CSVs and report pages the data contract
  ([#4](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/4))
  describes.
- `fixture/myst.yml.in` — template; `serve.sh` writes `myst.yml` from it
- `serve.sh` — `myst start` with the chosen `THEME_TEMPLATE`
- `theme.spec.ts` — rendering assertions (Chromium)
- `fouc.spec.ts` — FOUC guard, no snapshots (WebKit)

> The generated `fixture/myst.yml`, `fixture/_build/`, and `playwright-report/`
> are gitignored.
