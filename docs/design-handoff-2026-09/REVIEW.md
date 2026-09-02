# Review — Compliance theme handover package

> Written in `QuantEcon/quantecon-theme.mystmd`, the lecture theme repository, on
> 2026-09-02, before this repository existed. Issue and pull-request numbers are
> repository-qualified throughout for that reason.

Reviewed 2026-09-02 against the live state of everything the package touches, then
iterated twice with the maintainer: an adversarial pass on the repo structure and a
packaging pass on the directives. Section 10 records the final decisions.

| Source | State reviewed |
| --- | --- |
| `QuantEcon/quantecon-theme.mystmd` (the lecture theme, where this review was written) | `main` @ `47e37ed8` (v2.3.1 released 2026-08-26, plus quantecon-theme.mystmd#151) |
| QuantEcon `mystmd` fork (the local `myst` CLI) | `main` @ `12a8b26b`, v1.10.1 (qe-v10) |
| `QuantEcon/compliance-lecture-style` | `main` as of 2026-09-01 (Jupyter Book 1, 348 lecture reports + 5 series pages) |
| Upstream `jupyter-book/myst-theme` | `main` (monorepo: `packages/*` + `themes/book` + `themes/article`) |

The four `*.dc.html` references were read in full, including the `class Component`
data shapes, and cross-checked against the CSVs in `lectures/data/`.

## Verdict

The package is a strong brief. Goals, data contracts, component anatomy, tokens,
interactions and acceptance criteria are concrete enough to build from, and the
consumption model (pin a theme zip, register a plugin) mirrors what the lecture theme
already does. Five points needed a decision or a correction, and all five are now
decided (§10):

1. **The directives cannot be part of the theme.** mystmd offers no channel for a site
   template to contribute directives, so they are MyST plugins by necessity. They split
   into a generic, community-usable family and a QuantEcon-only compliance family, with
   different homes (§1, §9).
2. **The AST contract is portable, with no custom node types.** Custom nodes render as
   nothing in any other theme and error in PDF export. Standard nodes with class hooks
   and tone hints let the content repo migrate to mystmd before the theme exists (§2).
3. **Data-driven chrome needs a data channel.** The sidebar's series list and the footer
   stats come from CSVs the theme never sees. `site.parts` is the existing mechanism (§3).
4. **A shared "base theme" does not pay for itself.** The adversarial check found about
   600 lines of rarely changing boilerplate would actually be reused. The report theme is
   a self-contained sibling repo in the `quantecon-*.mystmd` family (§4, §5).
5. **Several data-contract details differ from the live repo,** and the issue/PR status
   on finding cards needed a data source (§6).

Section 7 lists the smaller design and spec gaps, section 8 is the inventory that fed
the structure decision, section 9 analyses the directives one by one, and section 10 is
the decision record.

---

## 1. Where do the directives live?

**Finding.** A MyST directive is expanded by the `myst` CLI while it parses the content
repo's markdown. The theme is a separate Remix process that receives only the resulting
AST JSON per page; it never sees source markdown. Facts from the fork's code settle the
question:

- Plugins are loaded only from `project.plugins` in the content project's `myst.yml`
  (`packages/myst-cli/src/plugins.ts`). An entry is a path or a URL to a `.mjs` file, or
  an executable; there is no npm specifier (`myst-config` `validatePluginInfo`).
  `template.yml` has no `plugins` field and `myst-templates` never touches plugins, so a
  theme zip cannot inject directives.
- Remote plugins **are** supported and documented: `resolveToAbsolute` fetches a
  URL-valued plugin path and caches it in the project's `_build` cache, and the mystmd
  docs' own example of a remote plugin is a GitHub release asset
  (`…/releases/download/<tag>/plugin.mjs`).
- A loaded bundle cannot import another remote bundle or an npm package, so multi-file
  source must be bundled into one file per plugin.
- When two loaded plugins register the same directive name, the **first wins** and every
  page gets a `duplicate directives registered` warning (`myst-parser/src/directives.ts`),
  so each family must be registered exactly once, and core directives, which are
  registered first, would silently win a name collision.

So "part of the theme and loaded into mystmd" is not an available option. Where each
plugin family lives is decided in §9 and §10.

**Constraints on plugin design** (all verified in the fork):

- Node built-ins only inside a bundle: no `js-yaml` (the package proposes YAML bodies) and
  no `csv-parse`. A small RFC-4180 reader covers these CSVs; YAML bodies become nested
  directives with options (§7).
- `DirectiveSpec.run` is synchronous and receives `vfile.path`. CSVs are read with
  `fs.readFileSync`, resolved relative to the project root (walk up to `myst.yml`), and
  cached per build keyed on path + mtime so `myst start` picks up regenerated CSVs.
- Transform plugins receive **no options** (`pipe.use(t.plugin, undefined, pluginUtils)`),
  so configuration is a directive option or an environment variable, as
  `QE_GIT_METADATA_MAX` already is.
- `fileError` from a directive plus `myst build --strict` exits non-zero
  (`process/site.ts`), which is how acceptance criterion 2 ("deleting a CSV fails the
  build loudly") is met. The compliance repo's deploy workflow must pass `--strict`.

## 2. The AST contract: portable, no custom node types

**Finding.** The package specifies a custom node type per directive, rendered only by this
theme. Two verified behaviours make that costly:

- `myst-to-react` renders an unregistered node type with `DefaultComponent`: a `<div>`
  containing the node's children, or an empty `<span>` if it has none. A childless custom
  node renders as **nothing** in the default book theme, in the lecture theme, and in any
  future QuantEcon theme.
- `myst-to-tex` raises `Unhandled LaTeX conversion for node of "<type>"` for any type it
  does not know, so PDF/typst export of a report page fails. It does handle `div` and
  `span`.

**Decision (D3).** Every directive emits a *portable* tree: `div`/`span` nodes with a
`class` (the shape the built-in `{div}` directive emits), standard `table`, `list`,
`paragraph` and `admonition` nodes, plus the core `grid` and `card` nodes, with the
structured data attached as node properties and a small set of **tone hints**
(`neutral`, `accent`, `good`, `warn`, `bad`). No custom node types at all: even the
finding card is a `card` with classed children. Themes upgrade those nodes with renderers
matched on type + class (`selectRenderer` in `myst-to-react` accepts `unist-util-select`
selectors, so `div[class~=qe-triage]` is a legal renderer key).

What this buys, in priority order:

1. `compliance-lecture-style` can migrate to mystmd **before the report theme exists**,
   building with the default or lecture theme and getting plain tables. The JB1 → mystmd
   migration (353 pages, TOC, code cells) is a project in itself and should not wait on
   the renderers.
2. Acceptance criterion 7 ("everything works with JS disabled except sorting/filtering")
   is met structurally, not by discipline.
3. PDF export keeps working; the theme remains replaceable; and the rubric thresholds
   live in exactly one place, the compliance plugin, because the theme only ever sees
   tones.

## 3. Data-driven chrome needs a channel

**Finding.** Three parts of the design are *site chrome* driven by CSV data, not page
content: the sidebar's series entries (priority dot, mono name, lecture count), the
snapshot card beneath them, and the footer statistic. The theme cannot read CSVs, and
the site manifest exposes only title/slug/level/date/thumbnail/tags per page, so the
plugin cannot smuggle per-series priority through page frontmatter either (transforms
cannot modify frontmatter).

**Recommendation (adopted).** Use `site.parts`. The lecture theme's footer already works
this way (`config.parts.footer.mdast`), and the fork processes part files through the
full page pipeline, plugins included (`selectProjectParts` feeds the same transform
chain). A `series_nav` part containing `{qe-series-nav}` and a `report_meta` part
containing `{qe-report-meta}` give the theme data-bearing AST for the sidebar and footer
with no new mechanism. Declare both parts in the report theme's `template.yml` next to
`footer`.

## 4. Repo structure: the adversarial check

**The question.** Should the repo become `packages/theme-common` + `themes/lecture` +
`themes/compliance` (the package's Phase 2, and my first recommendation), or should the
themes stay self-contained as a family?

**What a shared package would actually be used for.** The first pass measured what
*could* be shared: about 1,100 of 2,700 lines (§8). Measured against the reference
design, what the report shell *would* import is much smaller:

| Candidate | Lines | Would the report shell use it? |
| --- | ---: | --- |
| `backend/loaders.server.ts` + route bodies | ~380 | Yes, verbatim. Rarely changes. |
| `SidebarToggle`, `Tooltip` | ~60 | Mobile only; the design has no icon rail. |
| `PageHeaderHistory` | 214 | Only its date formatter (~20 lines); the footer shows a date, not a changelog. |
| Font helper, critical-CSS builder | ~40 | The pattern, with different values. |
| `LIST_RENDERERS` + `lists.css` | 140 | Harmless; report pages barely use fancy lists. |
| Toolbar frame, `GitHubButton`, `ThemeButton`, fullscreen, font scale, downloads, launch, compute, `ContentsSidebar`, `ProjectFrontmatter`, `SiteFooter` | ~1,000 | No: different anatomy, or hidden by D5, or lecture-only. |

Roughly 600 lines of boilerplate. The cost of duplicating it is near zero and upstream
is the witness: `jupyter-book/myst-theme`'s book and article themes duplicate their
`loaders.server.ts` almost verbatim (160 lines, 9 differ) and diverge heavily in
`root.tsx` and routes. They share only through published npm packages, and we publish
none. That was also PLAN.md Phase 0's recorded reasoning against a monorepo, and a
second theme changes "one theme" but not "no packages".

**What the shared package would cost.**

- A whole-tree move of the lecture app during the cutover window, forcing every open PR
  (quantecon-theme.mystmd#152, quantecon-theme.mystmd#144, quantecon-theme.mystmd#141, quantecon-theme.mystmd#155) to rebase.
- One lockfile: the report theme could not move to newer React or `@myst-theme/*` pins
  ahead of the lecture theme, which needs to stay boring for the all-or-nothing cutover
  (quantecon-theme.mystmd#147).
- Every shared change tested against two visual suites; the React Router 7 migration
  (quantecon-theme.mystmd#28) acquiring a third surface.
- Divergence pressure: the two designs differ in type scale, palette and layout, so shared
  components would grow variant props, recreating the "one theme, many ifs" problem inside
  the package.

**Decision (D1).** Minimal gains, real costs: no shared package. The report theme is a
**self-contained sibling repo**, `quantecon-theme-report.mystmd`, with the lecture
theme's scaffolding copied (about 1,200 lines: the four workflows, the Playwright
harness, `Makefile`, `scripts/`, `template/`). Compliance is its first variant; the shell
is named for its role because the QEP-3 `audit-*` and `status-*` repo types would reuse
the shell and the generic directives but not the rubric. The family is expressed by
naming, copied scaffolding and a conventions document, not by shared code. A shared
package is revisited only when a second consumer of shared *code* appears (the lecture
theme wanting the data-presentation renderers, or a third report variant).

**On the `.mystmd` suffix.** It is the right marker. MyST is the markup and spec;
`mystmd` is the JavaScript engine and `myst` CLI that Jupyter Book ≥ 2 is built on;
`myst-parser` is the Python/Sphinx implementation behind `quantecon-book-theme`. Themes
and plugins run only inside the mystmd engine, so the suffix says exactly what they
target, and PLAN.md Phase 0 already records it as the convention (deliberately not the
lectures' transitional `.myst` suffix).

**Runner-up, for the record.** A sibling app inside `quantecon-theme.mystmd` with the lecture app left
at the root avoids the move and keeps one CI and one plugin home, at the price of an
asymmetric tree, prefixed release tags for the second theme, and two long-lived
trackers in one repo.

## 5. Releases: plain tags per repo, bundles as release assets

**Decision (D2).** Each repo keeps plain `vX.Y.Z` tags and one zip: `quantecon-theme.zip`
(URL shape unchanged for lecture consumers) and `quantecon-theme-report.zip`. Plugin
bundles ship as **release assets** of the repo that owns them, the remote-plugin form the
mystmd docs show and immutable once published: `compliance.mjs` attached to each report
theme release, so the plugin/renderer contract is versioned by one tag; `datavis.mjs`
attached to each plugins-repo release. The package's `lecture-vX` / `compliance-vX` split
tags and my earlier lockstep proposal both fall away with separate repos.

## 6. Data contracts vs. the live repo

Checked against `lectures/data/` on `main` (2026-09-01):

| Package says | Repo has | Consequence |
| --- | --- | --- |
| `rule_reach_history.csv`: `period,rule,share_pct` | `period,corpus_size,rule,lectures_affected,total_occurrences,share_pct` | Superset; `qe-trend` can show absolute reach as well as share. |
| Empty cell = category not in scope | True for `series_summary.csv`; `scores.csv` uses `N/A` **and** `out-of-scope` (its `jax` column), and has a `jax` column the package omits | The reader needs an explicit null spec: `''`, `N/A` → not applicable; `out-of-scope` → distinct state (the Lecture Report design already renders "Out of scope" as its own note). |
| `qe-systemic` "reads series" | The per-series reach table is `series_rule_reach.csv` (not listed) | Add to the contract. |
| Not listed | `violations.csv` (series, lecture, rule, count), `judgment.csv`, `history.csv`, `history_mechanical.csv`, `snapshot_history.csv` | `violations.csv` + `judgment.csv` are what let `qe-issues` verify typed counts; `history*.csv` feed `qe-method-stats` and the like-for-like caveat. |
| `qe-issues`: body = YAML list with `lines`, `example` | Lines and example text exist only in the generated report markdown (from `reviews/*.json` via `qestyle_draft.py`), not in any CSV | Issue text is necessarily authored content. Refined rule: numbers that exist in a CSV may not be typed; where a count is typed for readability the plugin verifies it and errors on mismatch. |
| `qe-finding`: `issue-state`, `pr-state` (open/closed/merged) | No source; the reference renders placeholders (`programming#—`) | Decision D4 below. |

**Issue/PR status (D4).** Hand-typed state drifts and contradicts goal 2; a build-time
GitHub API call puts network, rate limits and non-reproducibility into a ledger whose own
principles forbid exactly that. **Decided:** the pass tooling records a `findings.csv`
(`where, rule, issue_url, issue_state, pr_url, pr_state, checked_at`) refreshed by
`/pass-measure`, and the card shows "as of ⟨date⟩".

**Hidden win worth stating.** Today `qestyle_report.py --splice` writes full tables
between `<!-- qe:NAME -->` markers (a 27-row ranked table per series, 348 score-breakdown
tables). With directives the tooling emits one line per region, diffs shrink to the
prose, and the CSV is the single source at build time as well as at generation time.
`qestyle_check.py`'s gate keeps its role for the hand-written claims (their open issue
compliance-lecture-style#5 is exactly about those).

## 7. Design and spec gaps

- **Toolbar anatomy.** The reference top bar is title + text nav links + a GitHub
  button; the lecture toolbar is an icon rail. The report shell builds its own bar (a
  fixed container, `LoadingBar` and search from `@myst-theme/site`); nav links come from
  mystmd's `site.nav` (already in the manifest as `nav`) rather than being hardcoded.
- **Sidebar.** Persistent at desktop (248px) and data-driven from the `series_nav` part;
  a mobile drawer modelled on PR quantecon-theme.mystmd#144's Popover-API rebuild once it lands.
- **Dark mode (D5).** Light-only first version; the `@myst-theme` contrast toggle is
  hidden in the report shell and tokens are CSS custom properties so a dark and an
  auto (system) scheme are additive later. Filed as a future feature request in the
  report repo, not part of this work plan.
- **Tokens.** The `qec-` Tailwind namespace is fine as the *interface*; the source of
  truth is CSS custom properties on `:root`, mapped into Tailwind
  (`'qe-accent': 'rgb(var(--qe-accent) / <alpha-value>)'`). The lecture theme's Phase 3
  (quantecon-theme.mystmd#89, seoul256 schemes) uses the same mechanism in its own repo; draft PR quantecon-theme.mystmd#155 there
  is the reference for moving lecture typography into a stylesheet and fixed the silent
  `typography` spread bug in `tailwind.config.js`.
- **Fonts.** `@fontsource-variable/source-serif-4` (5.3.0) exists; IBM Plex Mono is
  static-only (`@fontsource/ibm-plex-mono`, weights 400/500/600), which suits the spec.
  Both go through the `app/links.ts` route so `scripts/relative-css-asset-urls.mjs`
  rewrites their `url()`s (the quantecon-theme.mystmd#138 and quantecon-theme.mystmd#150 lesson). The inlined critical CSS and the FOUC
  guard carry the report values: serif fallback stack, body `#faf9f6`.
- **YAML bodies.** `qe-wins`, `qe-finding`, `qe-issues`, `qe-method-stats` take YAML
  lists in the body. Besides the no-dependency constraint (§1), YAML-in-body is a
  Sphinx idiom; MyST's is a container directive with item directives and options
  (`{grid}` + `{grid-item-card}`). `{qe-wins}` wrapping `{qe-win}` items with
  `:reach:`/`:effort:` options and a markdown body also gives descriptions real inline
  rendering (code spans, links).
- **Directive count.** Reduced by §9: three of the eighteen are dropped in favour of
  existing MyST, and the rest resolve to eight generic primitives plus core grid/card.
- **Directive names.** Core directives register first and win a name collision silently
  (§1). Generic names stay plain nouns for now; each family documents an alias fallback
  in case a future core directive takes a name.
- **Heatmap colour.** `oklch()` is fine in evergreen browsers and in Playwright's
  Chromium; no fallback needed.
- **Responsive gate.** Add a Playwright assertion that
  `document.documentElement.scrollWidth <= window.innerWidth` at 360/768/1024/1280 for
  every report fixture page. The 1% pixel budget would not catch a 20px overflow.
- **Static export path.** The compliance site deploys to GitHub Pages as a static build.
  Test with a real `myst build --html`, not only the `myst start` harness; that is where
  quantecon-theme.mystmd#138 and quantecon-theme.mystmd#150 hid.
- **Plugin registration in §2's `myst.yml`** uses bare filenames; per the quantecon-theme.mystmd#93 decision
  it should be pinned URLs for all three plugins, including `git-metadata.mjs` (the
  design footer shows "Last changed", so the report site wants it too).
- **Theme options.** Declare the report theme's `site.options` (e.g. `title_suffix`,
  `hide_theme_toggle`) in its `template.yml`. The lecture template declares none today
  and still works, but a second theme is the moment to start.

## 8. Current app inventory

Measured to test the shared-package idea; the conclusion is in §4. Line counts from
`main`. "Reusable" means the report shell would use it if a shared package existed;
"copy" means the sibling repo copies it as scaffolding instead.

| File | Lines | Reusable? | Notes |
| --- | ---: | --- | --- |
| `toolbar/Toolbar.tsx` | 73 | frame only | Different anatomy in the report design |
| `toolbar/SidebarToggle.tsx`, `Tooltip.tsx`, `ThemeButton.tsx`, `FullscreenButton.tsx`, `FontScaleListItems.tsx`, `GitHubButton.tsx`, `QuantEconButton.tsx` | 239 | toggle + tooltip | Others hidden by D5 or absent from the design |
| `toolbar/MobileActionsMenu.tsx` | 49 | no | |
| `toolbar/LaunchButton.tsx`, `launchUrls.ts` | 244 | no | Notebook launch is lecture-only |
| `ComputeToolbarSlot.tsx` | 25 | no | Thebe |
| `toolbar/DownloadButton.tsx` | 78 | no | Report site has no downloads |
| `PageHeaderHistory.tsx`, `PageProvider.tsx` | 231 | date formatter | Footer shows a date, not a changelog |
| `ContentsSidebar.tsx` | 158 | mobile drawer idea | Desktop layout differs; wait for quantecon-theme.mystmd#144 |
| `Outline.tsx`, `hooks/useScroll.tsx` | 102 | no | Design has no "On this page" outline |
| `ProjectFrontmatter.tsx`, `SiteFooter.tsx` | 110 | no | Blue-divider header/footer are the lecture look |
| `Page.tsx`, `PageContent.tsx`, `NavigationAndArticleWrapper.tsx` | 210 | no | Layout + Thebe providers |
| `ErrorPage.tsx`, `GridGuide.tsx` | 28 | yes | |
| `backend/loaders.server.ts` | 147 | yes, verbatim | Identical to upstream's too |
| `routes/*` (10 files) | 235 | yes, verbatim | |
| `root.tsx` | 187 | pattern | Critical CSS with report values |
| `links.ts` | 70 | pattern | Font self-hosting |
| `renderers.tsx` (`LIST_RENDERERS`) + `styles/lists.css` | 140 | harmless | |
| `styles/app.css`, `mpl-widget.css`, `tailwind.config.js` | 200 | no | Notebook widget CSS is lecture-only |
| `types.ts` | 29 | partly | `git_metadata` shape |
| Workflows, Playwright harness, `Makefile`, `scripts/`, `template/` | ~1,200 | **copy** | The sibling repo's scaffold |

## 9. Directive families and packaging

**What mystmd already provides**, checked in the fork: admonitions and `{div}`/`{span}`
take a class; the `myst-ext-grid` and `myst-ext-card` extensions emit `grid` and `card`
nodes every myst theme renders; `{csv-table}` exists but takes inline data only (its
`file` option is commented out) and tables render statically. Nothing in core or the
`myst-ext-*` family covers stat tiles, bar lists, stacked bars, heatmaps, sortable tables
or chip grids, which is exactly the gap the proposed directives fill.

| Directive | Generic structure | Compliance-specific part | Resolution |
| --- | --- | --- | --- |
| `qe-pass-badges` | pill row | labels only | generic `badges` |
| `qe-triage-table` | data table with bar and chip cells | attention, needs-work, weakest categories | compliance wrapper emitting `data-table` |
| `qe-key-insight` | accent callout | none | **drop**: admonition with a class |
| `qe-wins` / `qe-win` | card grid with progress bar | reach bands, effort tag | compliance wrapper emitting core `grid` + `card` |
| `qe-finding` | location, problem, status sub-card | all of it | compliance wrapper emitting a classed `card` |
| `qe-trend` | signed delta list | rule vocabulary | generic `delta-list`, compliance-fed |
| `qe-method-stats` | big-number tiles | none | generic `stats` |
| `qe-score-strip` | metric cards with mini bar | band colours | generic `stats` with tone hints |
| `qe-priority-bar` | stacked bar | bucket colours | generic `stacked-bar` |
| `qe-systemic` | label, bar, value rows | rule vocabulary, reach of total | generic `bar-list` |
| `qe-ranked-table` | sortable table, nulls last | cell rules, priority badge | generic `data-table` with tone hints |
| `qe-clean-rules` | chip grid | rule title lookup | generic `chips` |
| `qe-score-breakdown` | metric cards with note | band colours, N/A states | generic `stats` with tone hints |
| `qe-issues` / `qe-issue` | filterable card list | severity vocabulary | core `card` + a filter upgrade |
| `qe-strengths` | check list | none | **drop**: `{div}` with a class |
| `qe-actions` | numbered list | none | **drop**: `{div}` with a class |
| `qe-heatmap` | matrix heatmap with ramp | score range, N/A | generic `heatmap` |
| `qe-rule-reach-chart` | horizontal bars with a variant | proposed marker | generic `bar-list` |

Eight generic primitives (`stats`, `bar-list`, `stacked-bar`, `heatmap`, `data-table`,
`chips`, `badges`, `delta-list`), three drops, core grid/card reuse, and thin compliance
wrappers that read the CSVs, apply the rubric, verify typed numbers and emit the generic
nodes with tone hints. The theme implements roughly ten renderers instead of eighteen
bespoke components. The references justify the generalisation: the same pill, bar, grid
and tabular-number patterns recur a dozen times each across the four pages, so the
designer was already working from a kit. The adversarial caveat is the charting-DSL
rabbit hole: the option surface is capped at what the compliance pages use.

**Three families, three homes.**

| Family | Contents | Audience | Home | Consumed by |
| --- | --- | --- | --- | --- |
| Data presentation | the eight primitives; portable AST only | any mystmd project publishing reports or dashboards | `quantecon-plugins.mystmd`, bundle `datavis.mjs` | compliance repo now; status/audit repos later; the lecture theme if ever wanted |
| Repository metadata | `git-metadata` transform | any project, but rendering is theme-coupled today | stays in `quantecon-theme.mystmd` for now, tracked in quantecon-theme.mystmd#156 | lecture repos, compliance repo |
| Compliance rubric | the `qe-*` wrappers: schemas, bands, priority, verified counts, finding card | QuantEcon `compliance-*` repos only | beside the report theme, bundle `compliance.mjs` | compliance repo |

**Share the contract, not the code.** The compliance wrappers emit the same node shapes
the generic directives emit; they do not import the generic plugin's code at build time.
The cost is duplicating roughly 150 lines of node-building and CSV-reading helpers, which
is cheaper than a cross-repo build dependency and keeps each bundle self-contained. The
contract lives in the plugins repo as `CONTRACT.md` plus a JSON schema for node data, and
the report theme's renderers implement it. Any other myst theme can implement it too,
which is what makes the family usable beyond QuantEcon.

**Why a plugins repo now (D7).** It adds one small repo with node tests, an esbuild
bundle step and docs, no Remix and no Playwright; a contract document the portable-AST
decision needs anyway; and the discipline that generic code never imports compliance
code. The risk is churn while the contract is hot during the first build; the mitigation
is developing against a branch and cutting `v0.x` tags alongside the report theme's
releases. It is also exactly the trigger the quantecon-theme.mystmd#93 plugin-home decision named: a second,
non-theme-coupled plugin now exists.

**Naming.** `quantecon-plugins.mystmd` follows the family pattern
`quantecon-<thing>.mystmd` and says what it targets. `quantecon-myst-plugins`, the
placeholder in PLAN.md's open question 2, breaks the pattern. `myst-ext-*` is the
upstream core-extension namespace (`myst-ext-card`, `-grid`, `-exercise`, `-proof`,
`-tabs`, `-icon`, `-button`, `-reactive`) and should not be used before a family is
actually upstreamed. A QuantEcon repo is the right single starting point; if the data
family draws community interest it is extracted to a general project, and the
release-asset URLs already pinned keep working because releases stay.

## 10. Decisions (final, 2026-09-02)

| # | Decision | Outcome |
| --- | --- | --- |
| D1 | Structure | **Sibling repo `quantecon-theme-report.mystmd`**, self-contained, scaffold copied from `quantecon-theme.mystmd`; compliance is its first variant. No shared package. The `.mystmd` suffix stays: it marks tooling for the mystmd engine. |
| D2 | Releases | **Plain `vX.Y.Z` per repo.** One zip each; `quantecon-theme.zip` unchanged, `quantecon-theme-report.zip` new. Plugin bundles as release assets of the repo that owns them. |
| D3 | AST contract | **Portable, no custom node types.** Contract + JSON schema in the plugins repo; compliance wrappers emit the same nodes with tone hints. |
| D4 | Issue/PR status | **`findings.csv`** written by the pass tooling, shown "as of ⟨date⟩". |
| D5 | Dark mode | **Light-only first version.** Dark and auto schemes are a future feature request, filed in the report repo, not in this work plan. |
| D6 | Content-repo migration | **Separate project in `compliance-lecture-style`**, opened once the plugins and theme are available. |
| D7 | Generic extension | **Plugins repo now: `quantecon-plugins.mystmd`**, bundle `datavis.mjs` first; refactor to a general project if community interest appears. |
| D8 | `git-metadata` home | **Stays in `quantecon-theme.mystmd`.** Tracking issue quantecon-theme.mystmd#156 captures the move to the plugins repo as a standalone plugin. |

The plan that follows from these is in [PLAN.md](./PLAN.md).
