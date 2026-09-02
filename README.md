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

**Planning complete (2026-09-02); build not started.** Work hangs off this repository's
`Project`-typed tracker issue (see Issues). The design brief, the review that shaped the
decisions, and the phased plan are in
[`docs/design-handoff-2026-09/`](./docs/design-handoff-2026-09/):

| File | What it is |
| --- | --- |
| [`README.md`](./docs/design-handoff-2026-09/README.md) | The design brief: goals, data contracts, directive set, component specs, tokens, acceptance criteria |
| [`REVIEW.md`](./docs/design-handoff-2026-09/REVIEW.md) | Findings with evidence, and the decision record (D1–D8) |
| [`PLAN.md`](./docs/design-handoff-2026-09/PLAN.md) | The phased plan across the three repositories of the family |
| `*.dc.html` + `support.js` | High-fidelity references for the landing, series, lecture and charts pages (open next to `support.js`) |

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

## License

MIT — see [LICENSE](./LICENSE).
