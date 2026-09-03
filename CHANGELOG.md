# Changelog

All notable changes to `@quantecon/report-theme` (the QuantEcon MyST report theme) are
documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Release flow.** Each release is a `vX.Y.Z` git tag: pushing the tag triggers
> `release.yml`, which builds the theme and publishes a GitHub Release with
> **two** assets attached — `quantecon-theme-report.zip` (pinned from
> `site.template`) and `compliance.mjs` (pinned from `project.plugins`) — using
> that version's section of this file as the release notes. See
> [`CONTRIBUTING.md`](./CONTRIBUTING.md) "Releases". Nothing has been released
> yet; `v0.1.0` is the first planned tag.

## [Unreleased]

### Added

- The Phase 0 build, test and release scaffold, copied from the lecture theme
  [`quantecon-theme.mystmd`](https://github.com/QuantEcon/quantecon-theme.mystmd) at
  `47e37ed8` and adapted here — decision D1 makes this repository a self-contained
  sibling of that one rather than a package sharing its code
  ([#3](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/3)).
  - Four workflows: `ci.yml` (build, typecheck, unit tests, rendering tests, FOUC
    guard), `preview.yml` (per-PR GitHub Pages preview), `release.yml` (tag →
    zip → GitHub Release) and `update-snapshots.yml` (`/update-snapshots` on a
    PR).
  - The release bundle: `Makefile` (`make build-theme`, `make build-zip`),
    `template/` and `template.yml`, both version fields stamped from
    `package.json`.
  - The Remix application shell — `app/root.tsx` with the inlined critical CSS,
    the index and catch-all routes, the MyST content loaders, Tailwind and the
    self-hosted Source Sans 3 and KaTeX stylesheets. It renders article content
    in the centred grid and nothing more; the report shell is
    [#6](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/6).
  - The Playwright harness: the prose-only fixture in `tests/visual/fixture`,
    the WebKit FOUC guard, and structural rendering tests standing in for pixel
    baselines until the Phase 3 harness
    ([#9](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/9))
    has report components to baseline.
  - `scripts/relative-css-asset-urls.mjs`, which makes the built stylesheets'
    asset URLs relative so self-hosted fonts resolve in `myst build --html`
    output and under a `baseurl` as well as under `myst start`.

### Changed

- Relative to the lecture theme's scaffold, this repository drops the live-compute
  stack: `@myst-theme/jupyter`, the Thebe asset copy in `prod:build`, and the three
  `patches/` entries, all of which exist to make executable notebook cells work.
  Report sites have no code cells. The search index and the toolbar/sidebar chrome
  are dropped for now too — they return with the Phase 2 shell
  ([#6](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/6)) if that
  design keeps them.

[Unreleased]: https://github.com/QuantEcon/quantecon-theme-report.mystmd/commits/main
