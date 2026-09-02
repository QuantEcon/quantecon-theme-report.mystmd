# PLAN — QuantEcon report theme (compliance variant) and its plugin family

Status: **decisions made and trackers filed, 2026-09-02** (REVIEW.md §10). Both new repos
exist with an initial pull request open in each; the three `Project`-typed trackers and their native
sub-issues are listed in the last section, with the drafts under `workplan/`. Nothing in
the lecture theme's cutover tracker, quantecon-theme.mystmd#147, changes.

Companion documents: [REVIEW.md](./REVIEW.md) (findings, evidence, decision record),
[README.md](./README.md) (the design brief), the four `*.dc.html` references.

## Goal

Ship a report theme for `QuantEcon/compliance-lecture-style`, the first of the QEP-3
`compliance-*` repos, as a self-contained sibling of the lecture theme, with the generic
data-presentation directives published as a reusable plugin family, and without touching
the lecture theme during its all-or-nothing cutover.

## The family

```
quantecon-theme.mystmd            lecture theme — unchanged by this plan
                                  plugins/git-metadata.mjs stays (move tracked in quantecon-theme.mystmd#156)

quantecon-theme-report.mystmd     report theme; first variant: compliance
  app/                            Remix shell + renderers implementing the datavis contract
  app/components/compliance/      finding card, upgrades for wins/issues cards
  plugins/src/compliance/         qe-* wrappers: schemas, rubric, verified counts
  plugins/compliance.mjs          bundled; attached to each release as an asset
  template/, template.yml         zip: quantecon-theme-report.zip
  tests/visual/fixture/           sample CSVs + five pages; overflow + DOM tests
  .github/workflows/              copied from the lecture theme, then owned here

quantecon-plugins.mystmd          generic plugin families, portable AST only
  src/datavis/                    stats, bar-list, stacked-bar, heatmap, data-table,
                                  chips, badges, delta-list
  CONTRACT.md, schema/*.json      the node contract themes implement
  dist/datavis.mjs                bundled; attached to each release as an asset
  tests/                          `myst build` of a fixture project, AST assertions
```

Consumption per compliance repo, all pinned:

| `myst.yml` key | Value |
| --- | --- |
| `site.template` | `https://github.com/QuantEcon/quantecon-theme-report.mystmd/releases/download/vX.Y.Z/quantecon-theme-report.zip` |
| `project.plugins[0]` | `https://github.com/QuantEcon/quantecon-plugins.mystmd/releases/download/vA.B.C/datavis.mjs` |
| `project.plugins[1]` | `https://github.com/QuantEcon/quantecon-theme-report.mystmd/releases/download/vX.Y.Z/compliance.mjs` |
| `project.plugins[2]` | the `git-metadata.mjs` URL that `quantecon-theme.mystmd` documents (until quantecon-theme.mystmd#156 moves it) |

## Phases

### Phase 0 — Repos, scaffolds and contracts

- [ ] Create `quantecon-theme-report.mystmd` and `quantecon-plugins.mystmd` (maintainer
      action; both `.mystmd` per the recorded convention).
- [ ] Copy the lecture theme's scaffold into the report repo: `ci.yml`, `preview.yml`,
      `release.yml`, `update-snapshots.yml`, `playwright.config.ts`, `tests/visual/serve.sh`,
      `Makefile`, `scripts/relative-css-asset-urls.mjs`, `template/`, `patches/` as needed,
      `.nvmrc`, `.npmrc`. Rename zip and package (`quantecon-theme-report.zip`,
      `@quantecon/report-theme`, title "QuantEcon Report Theme"). `preview.yml` targets
      `compliance-lecture-style`'s mystmd branch.
- [ ] `FAMILY.md` in `quantecon-theme.mystmd` (linked from the others): the conventions every
      `quantecon-*.mystmd` repo keeps in step — release zip layout and `template.yml`
      stamping, tag-pinned plugin URLs as release assets, the visual harness with
      platform-suffixed baselines, the FOUC guard, asset-URL rewriting, Keep-a-Changelog
      format, `.mystmd` naming.
- [ ] **AST contract** in the plugins repo: `CONTRACT.md` and `schema/*.json` for the eight
      primitives (node types, `class` names, data props, tone hints, fallback rendering),
      plus the classed-`card` shapes the compliance wrappers emit.
- [ ] **Data contract** agreed with the compliance repo: every CSV and its columns
      (adding `series_rule_reach.csv`, `violations.csv`, `judgment.csv`, `history*.csv`,
      new `findings.csv`), null semantics (`''`/`N/A` vs `out-of-scope`), the `data/` root
      convention, the "typed numbers are verified" rule.
- [ ] Directive syntax sheet: container + item directives with options and markdown
      bodies replacing the YAML bodies.
- [ ] Open the coordinating issue in `compliance-lecture-style` (D6) and the future
      feature request "dark and auto colour schemes" in the report repo (D5).

Exit: both repos exist with green scaffold CI on an empty app; contracts merged.
Effort: 2–3 days.

### Phase 1a — `datavis.mjs` (plugins repo)

- [ ] Dependency-free CSV reader (RFC-4180 quoting), project-root resolution (walk up
      from `vfile.path` to `myst.yml`), per-build cache keyed on path + mtime.
- [ ] The eight directives, each with a capped option surface and portable output:
      `stats`, `bar-list`, `stacked-bar`, `heatmap`, `data-table` (sortable flag, null
      ordering), `chips`, `badges`, `delta-list`. Inline data and `:file:` CSV sources.
- [ ] esbuild bundle step → `dist/datavis.mjs`; a check that the bundle imports nothing.
- [ ] Tests: build a fixture project with the real `myst` CLI and assert the emitted AST
      per directive against the schema; render the fixture with the default book theme
      to prove the plain fallback.
- [ ] README per directive with examples; `v0.1.0` release with the bundle attached.

Exit: a stranger can pin `datavis.mjs` in any mystmd project and get tables and lists.
Effort: 3–4 days.

### Phase 1b — `compliance.mjs` (report repo)

- [ ] Schemas and readers for every CSV in the data contract; score semantics module
      (bands red ≤ 5.0 < amber < 8.6 ≤ green, priority derivation, in-scope mean),
      unit-tested against `series_summary.csv` fixtures.
- [ ] Wrappers in dependency order: data readers (`qe-triage-table`, `qe-score-strip`,
      `qe-priority-bar`, `qe-systemic`, `qe-ranked-table`, `qe-clean-rules`,
      `qe-score-breakdown`, `qe-heatmap`, `qe-rule-reach-chart`, `qe-trend`,
      `qe-pass-badges`, `qe-series-nav`, `qe-report-meta`), then authored containers
      (`qe-wins`/`qe-win`, `qe-finding`, `qe-method-stats`/`qe-stat`,
      `qe-issues`/`qe-issue`). Key insight, strengths and actions use existing MyST.
- [ ] Validation: `fileError` on a missing CSV or unknown series/lecture/rule, and when a
      typed count disagrees with `violations.csv`/`judgment.csv`; `fileWarn` for a
      proposed rule cited without its tag.
- [ ] Tests: fixture project with sample CSVs, AST assertions against the contract, the
      failure cases under `--strict`, and a duplicate-registration check when loaded
      alongside `datavis.mjs`.
- [ ] Bundle → `plugins/compliance.mjs`, attached to the report theme's releases.

Exit: `compliance-lecture-style` on a branch builds with mystmd, both plugins and the
**default or lecture** theme, showing plain tables for every region. This is the moment
the D6 project in the compliance repo can start. Effort: 3–4 days.

### Phase 2 — Report theme shell (report repo)

- [ ] `root.tsx` with critical CSS carrying the report values (serif fallback stack,
      body `#faf9f6`); fonts through the `links.ts` pattern: Source Sans 3, Source Serif 4
      variable, IBM Plex Mono 400/500/600.
- [ ] Tokens as CSS custom properties on `:root`, mapped into Tailwind under the `qec-`
      names from the brief.
- [ ] Top bar: fixed container, title block, `site.nav` links, GitHub button, search from
      `@myst-theme/site`; no launch, compute, downloads or contrast items.
- [ ] Persistent 248px sidebar at ≥ lg from the `series_nav` part; mobile drawer modelled
      on quantecon-theme.mystmd#144 once it lands; snapshot card from `report_meta`.
- [ ] Footer from the `footer` part + `report_meta`, with "Last changed" from the
      `git-metadata` data.
- [ ] Section-heading and admonition restyle on standard nodes; `template.yml` with
      title, options and parts (`footer`, `series_nav`, `report_meta`).

Exit: the fixture renders the shell around plain-table content; FOUC guard passes.
Effort: about a week.

### Phase 3 — Renderers (report repo)

- [ ] Contract renderers, one PR per primitive: `stats`, `bar-list`, `stacked-bar`,
      `heatmap` (oklch ramp + legend), `data-table` (client-side sort, SSR default order,
      nulls last), `chips`, `badges`, `delta-list`.
- [ ] Card upgrades matched on class: wins card with band bar and effort tag; issue card
      with severity stripe and the filter chips (client-side, unfiltered SSR); finding
      card with the issue/PR status sub-card.
- [ ] Tests: desktop + mobile snapshots of the five fixture pages; the
      no-horizontal-overflow assertion at 360/768/1024/1280; DOM assertions for sort
      toggle, null ordering, filter counts and the JS-disabled render; static-build smoke
      with `myst build --html --strict`; PR preview of `compliance-lecture-style`.

Exit: acceptance criteria 1 and 4 met on the fixture and the preview. Effort: 2 weeks.

### Phase 4 — Content migration and first releases

- [ ] Plugins repo `v1.0.0`; report theme `v1.0.0` with `quantecon-theme-report.zip` and
      `compliance.mjs` attached; verify the published assets by unzipping, as v2.3.1 was.
- [ ] `compliance-lecture-style` (its own project, D6): `myst.yml` with the TOC from
      `qestyle_toc.py`; pass tooling emits directive blocks in place of spliced tables;
      `findings.csv` joins the pass; `qestyle_check.py` reads directive regions;
      `charts.md` loses its code cells (no kernel in the build); `deploy.yml` runs
      `myst build --html --strict`; template and the three plugin URLs pinned.
- [ ] Acceptance criteria 1, 2, 3 and 5 verified on the live site.

Exit: the compliance site is live on mystmd with the report theme. Effort: about a week,
mostly in the compliance repo.

### Phase 5 — Follow-ups (not gating)

- [ ] Dark and auto colour schemes for the report theme (the D5 feature request).
- [ ] quantecon-theme.mystmd#156: move `git-metadata` into the plugins repo as a standalone plugin.
- [ ] `UPSTREAM-CANDIDATES.yml` entries: the portable-directive pattern and the datavis
      family; extract to a general project or propose upstream if interest appears.
- [ ] A `docs/` feature reference for the report theme mirroring the lecture one.

## Sequencing

```
Phase 0  repos + scaffolds + contracts
   │
   ├──▶ Phase 1a  datavis.mjs   (plugins repo)  ──┐
   │                                              ├──▶ compliance repo can start its D6 project
   ├──▶ Phase 1b  compliance.mjs (report repo)  ──┘                │
   │                                                               │
   └──▶ Phase 2   report shell   (report repo)  ──▶ Phase 3  renderers ──▶ Phase 4  releases + migration
```

Phases 1a, 1b and 2 run in parallel after Phase 0; only Phase 3 needs all three. The
lecture repo has no work item in this plan beyond `FAMILY.md` and quantecon-theme.mystmd#156.

## Risks

| Risk | Mitigation |
| --- | --- |
| Three repos drift on the node contract | The contract is versioned in the plugins repo; nodes carry a `contract` version prop; the report theme pins the plugins version it renders. |
| Copied scaffolds diverge (a fix like the snapshot-bot CI nudge applied in one repo only) | `FAMILY.md` lists the shared conventions; a quarterly diff of the four workflows. |
| Dependabot load doubles (36 open alerts here today; the same Remix v1 chain) | Accepted; the `overrides` posture in `SECURITY.md` is copied; the RR7 migration (quantecon-theme.mystmd#28) clears the bulk in both repos. |
| Hot contract churn during Phases 1–3 | Develop against a branch pin; `v0.x` tags with the report theme's releases; freeze the contract at the Phase 3 exit. |
| Generic directive names collide with a future core directive (core wins silently) | Plain names now; documented alias fallback per family; a test that fails if `myst` ships a same-named directive. |
| Charting-DSL scope creep in `datavis` | Option surface capped at what the compliance pages use; new options need a second consumer. |
| Remix v1 constraints; RR7 later means two shells to migrate | Accepted; shells are thin and independently pinned, so the report theme can move first. |
| esbuild deadlock during `prod:build` (known flake) | Retry; the copied CI already times out at 20 minutes. |
| Directive validation too strict for edge cases (shared lectures across `lecture-dp`/`lecture-python.myst`, compliance-lecture-style#3) | Warn rather than error for provenance ambiguities; only missing data and count mismatches are errors. |

## Effort summary

| Phase | Effort | Calendar dependency |
| --- | --- | --- |
| 0 — repos, scaffolds, contracts | 2–3 days | maintainer creates the repos |
| 1a — `datavis.mjs` | 3–4 days | Phase 0 |
| 1b — `compliance.mjs` | 3–4 days | Phase 0 |
| 2 — report shell | ~1 week | Phase 0 |
| 3 — renderers | ~2 weeks | Phases 1a, 1b, 2 |
| 4 — releases + migration | ~1 week | Phase 3; compliance-repo owner |

## Trackers (filed 2026-09-02)

| Repo | Issue | Genre |
| --- | --- | --- |
| `quantecon-theme-report.mystmd` | [#2](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/2) "Report theme — compliance variant — tracking", sub-issues quantecon-theme-report.mystmd#3 to quantecon-theme-report.mystmd#10 (Phase 0 scaffold, Phase 0 data contract, 1b compliance plugin, 2 shell, 3 renderers, 3 card upgrades, 3 test harness, 4 first release) | long-lived tracker, `Project` type |
| `quantecon-theme-report.mystmd` | [#11](https://github.com/QuantEcon/quantecon-theme-report.mystmd/issues/11) "Dark and auto colour schemes for the report theme" | future feature request (D5) |
| `quantecon-plugins.mystmd` | [#2](https://github.com/QuantEcon/quantecon-plugins.mystmd/issues/2) "datavis plugin family v1 — tracking", sub-issues quantecon-plugins.mystmd#3 to quantecon-plugins.mystmd#7 (contract + schema, toolchain, tiles and bars, tables and lists, docs + v0.1.0) | long-lived tracker, `Project` type |
| `quantecon-plugins.mystmd` | [#8](https://github.com/QuantEcon/quantecon-plugins.mystmd/issues/8) "Extract or upstream the data family if community interest appears" | future (`discuss`) |
| `compliance-lecture-style` | [#28](https://github.com/QuantEcon/compliance-lecture-style/issues/28) "Migrate the ledger to mystmd with the report theme — tracking", sub-issues compliance-lecture-style#29 to compliance-lecture-style#34 (data contract + findings.csv, MyST TOC, directive emission, gate + runbook, native charts, deploy) | migration project (D6), `Project` type; build items gated on the report theme's Phase 1b exit |
| `quantecon-theme.mystmd` | [#156](https://github.com/QuantEcon/quantecon-theme.mystmd/issues/156) move `git-metadata` to the plugins repo (D8); `FAMILY.md` as a small PR (Phase 0) | done / small |

The two new repositories were created on 2026-09-02 with the QEP-2 label set and delete-branch-on-merge; each has an initial pull request adding its README, and the report repo's also commits this design bundle under `docs/design-handoff-2026-09/`. The trackers are not on the projects dashboard until registered in `QuantEcon/status-projects` `projects.yml`; draft rows are in `workplan/projects-registry-rows.yml`.
