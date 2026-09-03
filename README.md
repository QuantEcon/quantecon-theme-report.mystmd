# QuantEcon Report Theme — for MyST Markdown

A dedicated [MyST](https://mystmd.org) site theme for QuantEcon **report** sites: the
standing conformance ledgers of the `compliance-*` repositories first
([`QuantEcon/compliance-lecture-style`](https://github.com/QuantEcon/compliance-lecture-style)
is the first consumer), with the `audit-*` and `status-*` repository types to follow.
It is the sibling of the lecture theme,
[`quantecon-theme.mystmd`](https://github.com/QuantEcon/quantecon-theme.mystmd), and
follows the same release mechanics: a zip attached to each GitHub Release, pinned by URL
from a project's `myst.yml`.

The `.mystmd` suffix marks a repository as tooling for the **mystmd** engine (the
JavaScript `myst` CLI that Jupyter Book ≥ 2 is built on), as distinct from content
repositories and from the Sphinx / `myst-parser` world.

## Status

**Planning complete (2026-09-02); Phase 0 scaffold in progress.** Work hangs off the `Project`-typed
tracker [#2](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/2); its
sub-issues are the phases. Dark and auto colour schemes are a future request,
[#11](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/11). The generic
directives are tracked in
[quantecon-plugins.mystmd#2](https://github.com/QuantEcon/quantecon-plugins.mystmd/issues/2)
and the ledger's migration in
[compliance-lecture-style#28](https://github.com/QuantEcon/compliance-lecture-style/issues/28). The design brief, the review that shaped the
decisions, and the phased plan are in
[`docs/design-handoff-2026-09/`](./docs/design-handoff-2026-09/):

| File | What it is |
| --- | --- |
| [`README.md`](./docs/design-handoff-2026-09/README.md) | The design brief: goals, data contracts, directive set, component specs, tokens, acceptance criteria |
| [`REVIEW.md`](./docs/design-handoff-2026-09/REVIEW.md) | Findings with evidence, and the decision record (D1–D8) |
| [`PLAN.md`](./docs/design-handoff-2026-09/PLAN.md) | The phased plan across the three repositories of the family |
| `*.dc.html` + `support.js` | High-fidelity references for the landing, series, lecture and charts pages (open next to `support.js`). They load React, ReactDOM and Babel from unpkg when opened and evaluate their inline component script, so treat them as local design references only, never as code to ship |

## What ships from here

Each `vX.Y.Z` release attaches two assets:

| Asset | Purpose | Pinned from `myst.yml` as |
| --- | --- | --- |
| `quantecon-theme-report.zip` | the theme | `site.template` |
| `compliance.mjs` | the compliance directives (`qe-*`): CSV-backed, rubric-aware wrappers that emit portable MyST AST | an entry in `project.plugins` |

The generic data-presentation directives those wrappers build on ship separately from
[`quantecon-plugins.mystmd`](https://github.com/QuantEcon/quantecon-plugins.mystmd) as
`datavis.mjs`; the per-page git history comes from the lecture theme's
`git-metadata.mjs`. A compliance site pins all three plugin URLs plus the theme zip.

## Design principles carried from the review

- **Portable AST, no custom node types.** Every directive emits standard MyST nodes
  (classed `div`/`span`, tables, lists, admonitions, core `grid`/`card`) with tone hints,
  so content renders in any theme and in PDF export; this theme upgrades those nodes.
- **Numbers are derived, never typed.** Directives read the ledger's CSVs at build time;
  a missing file or a typed count that disagrees with the data fails a `--strict` build.
- **Self-contained.** No shared package with the lecture theme; the family is held
  together by naming, copied scaffolding and a conventions document.

## Development

```sh
npm ci               # package-lock.json is committed
npm run compile      # tsc --noEmit
npm run prod:build   # Tailwind + Remix + asset-URL rewrite
make build-zip       # the release-equivalent bundle, in .deploy/
```

[`CONTRIBUTING.md`](./CONTRIBUTING.md) covers the scripts, the test harness and the
release flow; [`SECURITY.md`](./SECURITY.md) covers the Remix v1 pin and the dependency
`overrides` posture. The build, test and release machinery was copied from the lecture
theme and is **owned here** — a fix in one repository does not reach the other. The
conventions the two are meant to keep in step will be written down in the lecture
theme's `FAMILY.md` and linked from here once that lands.

## License

MIT — see [LICENSE](./LICENSE).
