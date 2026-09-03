# Contributing to quantecon-theme-report.mystmd

Thank you for your interest in contributing to the QuantEcon report theme!

## Relationship to the lecture theme

This repository is a **self-contained sibling** of
[`quantecon-theme.mystmd`](https://github.com/QuantEcon/quantecon-theme.mystmd), not a
package that shares code with it (decision D1 in
[`docs/design-handoff-2026-09/REVIEW.md`](./docs/design-handoff-2026-09/REVIEW.md)). The
build, test and release machinery here was **copied** from that repository and is now
owned here: fixing something in one does not fix it in the other. What the two repositories
keep deliberately in step — release zip layout and `template.yml` stamping, tag-pinned
plugin URLs as release assets, the visual harness with platform-suffixed baselines, the
FOUC guard, asset-URL rewriting, Keep-a-Changelog format, `.mystmd` naming — is written
down in the lecture theme's `FAMILY.md`. Read it before changing any of them.

## Prerequisites

- **Node.js** — `.nvmrc` pins **24**, matching the CI runner. The unit tests
  (`npm run test:unit`) use `node --test`, which needs **Node ≥ 20**; the built theme
  supports Node ≥ 20 (`engines.node`).
- **npm** — whatever ships with Node 24; the lockfile is `lockfileVersion` 3.
- **mystmd** on `PATH` for the rendering and FOUC suites (`npm install -g mystmd`),
  which build and serve the fixture.
- **jq** for `make build-theme` / `make build-zip`.

## Development setup

```bash
git clone https://github.com/QuantEcon/quantecon-theme-report.mystmd.git
cd quantecon-theme-report.mystmd

npm install
npm run dev
```

The dev server runs at `http://localhost:3000` by default. It needs a MyST content
server on port 3100 to have anything to render — run `myst start` in a project
(`tests/visual/fixture` will do) alongside it.

## Available scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start dev server with CSS watch + hot reload |
| `npm run prod:build` | Production build (CSS + Remix + asset-URL rewrite) |
| `npm run compile` | TypeScript type-check (`tsc --noEmit --skipLibCheck`) |
| `npm run test:unit` | Unit tests (`node --test`) |
| `npm run test:visual` | Playwright rendering suite against the fixture |
| `npm run test:visual:update` | Refresh the local (`-darwin`) baselines |
| `npm run test:fouc` | WebKit first-paint guard (`webkit-fouc` project) |
| `npm run build:css` | Tailwind build only (`styles/app.css` → `app/styles/app.css`) |
| `npm run format` | Format code with Prettier |
| `npm run clean` | Remove build artifacts |

## Project structure

```
app/
  backend/       # Server-side loaders (Remix loader functions)
  components/    # React components
  routes/        # Remix route modules
  root.tsx       # App shell (document head, critical CSS, providers)
plugins/         # compliance.mjs — the qe-* directives (Phase 1b, #5)
scripts/         # Build-time helpers
styles/
  app.css        # Tailwind CSS entry point
template/        # What ships inside the release zip
tests/
  unit/          # node --test
  visual/        # Playwright: fixture, rendering suite, FOUC guard
```

## Making changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. **Type-check** before committing: `npm run compile`
3. **Test a production build** to catch build-time issues: `npm run prod:build`
4. **Open a pull request** against `main`. CI runs the build, the rendering suite and the
   FOUC guard, and deploys a preview.

## Commit convention

We use conventional commits:

- `fix:` — Bug fixes
- `feat:` — New features
- `chore:` — Maintenance (deps, config, CI)
- `docs:` — Documentation only
- `ci:` — CI/workflow changes

## Releases

Versioning is **manual**: a curated [Keep a Changelog](https://keepachangelog.com/) entry
plus a `vX.Y.Z` git tag.

As you work, add your change to the `## [Unreleased]` section of
[`CHANGELOG.md`](./CHANGELOG.md) under the appropriate category (`Added` / `Changed` /
`Fixed` / `Security` / `Dependencies`), with a link to the PR.

To cut a release:

1. In `CHANGELOG.md`, move the `## [Unreleased]` entries under a new
   `## [X.Y.Z] - YYYY-MM-DD` heading, add the footer compare link, and re-point the
   `[Unreleased]` compare link's base at the new tag (`compare/vX.Y.Z...HEAD`).
   Wrapping the entry text is fine — the release workflow unwraps it, because GitHub
   renders release bodies (unlike committed Markdown) with single newlines as line breaks.
2. Bump the version in `package.json` (e.g. `npm version X.Y.Z --no-git-tag-version`).
   You do **not** need to bump `template.yml` — the release workflow stamps its `version`
   from `package.json` into the published bundle, so the two cannot drift. (Keeping the
   committed value in step is still checked by `npm run test:unit`, because it is what a
   reader of the repository sees.)
3. Commit (`chore(release): prepare vX.Y.Z`) and open a PR.
4. After merge, tag the release commit and push the tag:
   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```
5. The tag triggers [`release.yml`](./.github/workflows/release.yml), which builds the
   theme, zips the bundle, and publishes a **GitHub Release** for the tag with two assets:

   | Asset | Pinned from `myst.yml` as |
   | ----- | ------------------------- |
   | `quantecon-theme-report.zip` | `site.template` |
   | `compliance.mjs` | an entry in `project.plugins` |

   The workflow **fails** if the tag does not match `package.json` or if `CHANGELOG.md`
   has no `## [X.Y.Z]` section. Until Phase 1b
   ([#5](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/5)) builds
   `plugins/compliance.mjs`, that asset is simply absent and the workflow logs a warning
   rather than failing — see the comment in the workflow.

If a release run fails, the failed run published nothing, so recovery is safe:

- **Transient build failure** (e.g. the occasional esbuild hang): no changes needed —
  re-run the failed workflow from the Actions UI.
- **Guard failure** (version mismatch / missing changelog section): land the fix on
  `main` via a PR, then **move the tag** to the new commit — a pushed tag cannot simply
  be re-pushed:
  ```bash
  git tag -f vX.Y.Z <new-commit-sha>
  git push --force origin vX.Y.Z
  ```

To test the bundle locally without cutting a release, use `make build-theme` (assembles
the bundle into `.deploy/quantecon-theme-report`, as used by the test harness) or
`make build-zip` (also produces the release-equivalent zip).

## Notes

- The theme is built on [Remix v1](https://remix.run/) and
  [@myst-theme](https://github.com/jupyter-book/myst-theme). The `~1.17.0` Remix pin is
  deliberate — see [`SECURITY.md`](./SECURITY.md) and the comment in
  [`.npmrc`](./.npmrc).
- Tailwind CSS is used for styling — see `tailwind.config.js`.
- TypeScript strict mode is enabled — all code must pass `tsc --noEmit`.
- Report sites have no executable code cells, so unlike the lecture theme this
  repository carries no Thebe/Jupyter stack and no `patches/`.
