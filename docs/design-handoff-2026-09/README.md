# Project Specification: QuantEcon Compliance Theme (`quantecon-theme-compliance`)

A MyST web theme for QuantEcon compliance/audit reports (first consumer:
[`QuantEcon/compliance-lecture-style`](https://github.com/QuantEcon/compliance-lecture-style)),
built as a layer on the existing
[`QuantEcon/quantecon-theme.mystmd`](https://github.com/QuantEcon/quantecon-theme.mystmd)
lecture theme.

## About the design files in this bundle

The four `*.dc.html` files are **high-fidelity design references built in HTML**
(open them in a browser alongside `support.js`). They are prototypes showing the
intended look and behavior — **not production code**. The task is to recreate
them as React components inside the quantecon-theme.mystmd stack (Remix +
`myst-theme` packages + Tailwind CSS), following that repo's established
patterns (`app/renderers.tsx` NodeRenderers overrides, `plugins/*.mjs` MyST
transforms, `tailwind.config.js` token extensions).

Fidelity: **hifi** — colors, type, spacing, and component anatomy are final
intent; recreate faithfully, but express values through Tailwind tokens rather
than hard-coded inline styles.

---

## 1. Goals

1. Compliance projects author in MyST Markdown (they do today, under Jupyter
   Book 1.x) and get a modern, readable, data-driven report site by pinning a
   theme zip in `myst.yml` — same consumption model as the lecture theme.
2. Structured report blocks (score tables, rankings, findings) become **MyST
   directives backed by the repo's `lectures/data/*.csv`**, rendered as rich
   React components — so the visuals cannot drift from the measured data.
3. Shared chrome (toolbar, git-history header, fonts, footer, CI, release
   flow) is reused from the lecture theme, not rebuilt.

## 2. Architecture

Restructure `quantecon-theme.mystmd` into an npm-workspaces monorepo:

```
quantecon-theme.mystmd/
  packages/
    components/          # @quantecon/theme-components — shared base
      src/toolbar/       # existing toolbar components (moved)
      src/header/        # PageHeaderHistory etc (moved)
      src/compliance/    # NEW report components (this spec, §5)
      src/tokens.ts      # shared tailwind token fragments
  themes/
    lecture/             # current theme, thinned; releases lecture zip
    compliance/          # NEW Remix shell; releases compliance zip
      template.yml       # kind: site, title: QuantEcon Compliance Theme
  plugins/
    git-metadata.mjs     # existing
    compliance.mjs       # NEW directives plugin (§4)
```

Sequencing (do NOT restructure first):

- **Phase 1**: build `plugins/compliance.mjs` + compliance components in-tree
  in the current repo layout, registered via `app/renderers.tsx`. Ship behind
  the existing release flow. Content repo migrates from Jupyter Book 1 to
  mystmd (`myst.yml` replacing `_config.yml`/`_toc.yml`).
- **Phase 2**: extract the workspace structure above once the component set
  has stabilized. Tags `lecture-vX.Y.Z` / `compliance-vX.Y.Z` each release
  their own zip via the existing `release.yml` pattern.

Consumption (per compliance repo):

```yaml
# myst.yml
site:
  template: https://github.com/QuantEcon/quantecon-theme.mystmd/releases/download/compliance-v1.0.0/quantecon-theme-compliance.zip
project:
  github: https://github.com/QuantEcon/compliance-lecture-style
  plugins:
    - git-metadata.mjs
    - compliance.mjs
```

## 3. Data contracts

The plugin reads these CSVs from `lectures/data/` at build time (schemas as
they exist in compliance-lecture-style today):

- `series_summary.csv`: `series,lectures,writing,math,code,figures,references,links,admonitions,overall,HIGH,MEDIUM,LOW,NONE` (+ a `TOTAL` row). Empty cell = category not in scope.
- `rule_reach.csv`: `rule,category,lectures_affected,total_occurrences,proposed`
- `rule_titles.csv`: `rule,title,proposed`
- `rule_reach_history.csv`: `period,rule,share_pct` (drives trend deltas)
- `scores.csv` / `scores_mechanical.csv`: per-lecture per-category scores
- `snapshot.json`: pinned commit per series

Score semantics (from the published rubric): 0–10 per category; priority
HIGH when any in-scope category ≤ 5.0 (or overall ≤ 5.0), NONE when ≥ 8.6;
overall = mean of in-scope categories. Bands used for color:
**red ≤ 5.0 < amber < 8.6 ≤ green**.

## 4. `plugins/compliance.mjs` — directive spec

MyST plugin (same pattern as `git-metadata.mjs`) defining directives that emit
custom AST nodes. Directives take a `data` option (path to the CSV dir,
default `data/`) so the plugin stays content-agnostic. Node renderers (§5)
consume the nodes.

| Directive | Args/options | Emits |
|---|---|---|
| `{qe-pass-badges}` | pass, prev, lectures, series, rules | Pill row: current pass, comparison pass, corpus size |
| `{qe-triage-table}` | reads series_summary | Ranked series table: attention badge, score bar, needs-work fraction, weakest-category chips |
| `{qe-key-insight}` | body = markdown | Accent-left callout card (blue accent; `tone: warning` → red accent) |
| `{qe-wins}` | body = YAML list: title, desc, reach, effort(mechanical\|human) | 2-up card grid with banded reach bars (§5.3) |
| `{qe-finding}` | where, rule, issue, issue-state, pr, pr-state; body = problem markdown | Fix-immediately card with issue/PR status card (§5.4) |
| `{qe-trend}` | reads rule_reach_history | Improving/regressing two-column rule list with deltas |
| `{qe-method-stats}` | body = YAML list: value, denom?, label | Big-number stat cards |
| `{qe-score-strip}` | series | Per-category score cards with mini bars (series report header) |
| `{qe-priority-bar}` | series (or all) | Stacked HIGH/MEDIUM/LOW/NONE bar(s) |
| `{qe-systemic}` | series | Rule-reach list with bars, `reach/total · N×` |
| `{qe-ranked-table}` | series; reads scores.csv | Sortable per-lecture score table |
| `{qe-clean-rules}` | body = rule ids | Green ✓ chip grid (titles from rule_titles.csv) |
| `{qe-score-breakdown}` | lecture | Category cards with score + one-line note |
| `{qe-issues}` | body = YAML issue list: severity, rule, title, count, lines, example | Severity-filtered issue cards |
| `{qe-strengths}` / `{qe-actions}` | body = markdown list | Green check list / numbered action list |
| `{qe-heatmap}` | reads series_summary | Series × category heatmap grid |
| `{qe-rule-reach-chart}` | limit (default 18) | Horizontal reach bars |

Where a directive names data that the CSVs already carry, the CSV wins —
hand-typed numbers are refused (build warning) to preserve the "cannot drift"
guarantee. Narrative content stays ordinary MyST markdown between directives.
Standard admonitions (`note`, `warning`) are restyled by the theme (§5.5), not
replaced.

## 5. Component spec

All measurements from the hifi references. Express as Tailwind classes via new
tokens (§6). Base type: Source Sans 3 Variable (already self-hosted in the
theme). Add **Source Serif 4** (display/headings) and **IBM Plex Mono**
(rule IDs, file paths, numbers-as-code) via `@fontsource`, self-hosted like
Source Sans 3 (see `app/links.ts` pattern).

### 5.0 Page shell
- Top bar: 58px, `#14243c`, white logo block 30px radius 6 `#2c72b8` with serif
  "Q", title "QuantEcon / Lecture Style Compliance" (suffix at 75% opacity),
  right-aligned nav links `#c8d4e4` 13.5px/500, GitHub button 1px border
  `rgba(255,255,255,.25)` radius 6. Sticky. (Adapt: reuse the existing theme
  toolbar, restyled — do not build a second toolbar.)
- Sidebar 248px: section labels 11px/700 uppercase tracking .09em `#8a8577`;
  items 13.5px, radius 6, hover `#f1efe8`; active `#eceef4` + `#14243c` 600.
  Series entries: 8px colored dot (priority color) + mono name + count.
- Main column: max-width 980px, padding `48px clamp(20px,4vw,56px) 80px`.
- Section heading: Source Serif 4 26px/700 with 2px bottom border `#14243c`
  (red `#a63a2e` variant for the fix-immediately section), optional 13px
  `#8a8577` kicker beside it.
- Footer: 1px top border `#e7e3d9`, 12.5px `#8a8577`, license left / meta right.

### 5.1 Triage table (`qe-triage-table`)
Grid `58px minmax(160px,1.4fr) minmax(110px,1fr) 88px minmax(150px,1fr)`,
gap 14px. Row: 13px padding, top border `#eae6dc`, hover `#f4f2ec`, radius 8.
Attention: 12px/700 `HIGH` `#a63a2e` / `SOME` `#c07a1d`. Series name: IBM Plex
Mono 12.5px link. Score: 6px track `#e7e3d9` + fill in attention color +
tabular 14px/600 value. Needs work: `**43** / 68`. Weakest chips: 11.5px/600
`#f0ece2`/`#6b5d34`, radius 5.

### 5.2 Key-insight callout
White card, 1px `#e7e3d9`, 4px left accent `#2c72b8` (or `#a63a2e`), radius 10,
padding 18/22, 15px/1.6 `#2b3444`.

### 5.3 Biggest-wins cards (`qe-wins`)
Grid `repeat(auto-fit, minmax(300px,1fr))` gap 12. Card: white, 1px `#e7e3d9`
(hover `#b9c6d8`), radius 10, padding 16/18. Header row: 15px/700 title +
effort tag 11px/700 — MECHANICAL `#e8f0e9`/`#3e7d4f`, HUMAN PASS
`#f3ecdf`/`#8a5a1a`. Desc 13.5px `#6a7180`. Footer row: 5px reach bar on
`#eeeade`, **fill color banded by share of corpus**: ≥75% `#173f6d`, ≥60%
`#2c72b8`, ≥45% `#5f8fc2`, ≥30% `#96b3d2`; white % badge in band color
(radius 5, 2/8 padding); "N lectures" 12.5px `#6a7180`. Legend row of band
swatches below the grid.

### 5.4 Fix-immediately finding card (`qe-finding`)
Card `#fdf7f5`, 1px `#ecd5cf`, radius 10, padding 15/18. **Flex-wrap** layout
(must degrade at narrow widths — see Interactions):
- Location col (`flex:1 1 200px; min 180 / max 260`): mono 12.5px `#8c2f24`
  link, word-break; rule id 11px `#b07a70` below.
- Problem col (`flex:999 1 260px; min 240`): 14px/1.55 `#4a3833`,
  bold lead — "**problem** — why".
- Issue-status card (`flex:1 1 220px; min 210 / max 260`): white, 1px
  `#e7ddd4`, radius 8. Top row = issue: 14px state ring (2px border, 5px inner
  dot; open `#3e7d4f`, closed `#7d5bb5`), title 12.5px/600, `repo#N ·
  state` mono 11px. Bottom row (1px `#f1ede4` divider) = fixing PR: icon
  (⇋ merged / ⎇ open / ·), mono ref, right badge 10px/700 — MERGED
  `#7d5bb5`/`#f1ecf8`, OPEN `#3e7d4f`/`#e8f0e9`, NO PR `#8a8577`/`#f1ede4`.
  Both rows link out (issue URL / PR URL).

### 5.5 Admonition restyle (theme-wide)
White card, 1px `#e7e3d9`, radius 10, header strip 10/18 13px/700:
note → `#eef2f7`/`#17538f` "◈"; warning → `#faf1e4`/`#8a5a1a` "⚠".
Body 14px/1.6 `#414b5c`, inline code IBM Plex Mono 12.5px.

### 5.6 Series report page
- Header: breadcrumb (13px `#8a8577`, mono crumbs); serif h1 38px; pill
  metadata badges (mono 12px, 1px `#ddd8cc`, radius 999); right score card
  (white, radius 12, serif 40px + "/ 10" 18px `#8a8577`, uppercase label).
- Score strip: auto-fit minmax(120px,1fr) cards — uppercase 11.5px label,
  serif 24px score in band color, 4px mini bar.
- Priority bar: 34px stacked segments with inline `LABEL · N` (omit label when
  segment < ~6%); HIGH `#a63a2e`, MEDIUM `#d98f4e`, LOW `#c8b25a` (dark text
  `#4a4020`), NONE `#3e7d4f`.
- Systemic rules: grid `130px 1fr minmax(120px,200px) 90px`; rule chip
  `#eef2f7`/`#17538f`; bar fill `#2c72b8`; right `**reach**/27 · N×`.
- Recommendations: numbered cards — 28px `#14243c` circle, 15px/700 title,
  13.5px `#6a7180` body.
- Ranked table: grid `34px minmax(160px,1.3fr) repeat(6,minmax(58px,.55fr))
  74px 76px`, min-width 780px inside `overflow-x:auto` card. Sortable headers
  (see Interactions). Writing values ≤ 4 render `#a63a2e`/700. Priority badge
  colors: HIGH `#f6e5e2`/`#8c2f24`, LOW `#f2edd7`/`#6b5d34`, NONE
  `#e5efe7`/`#2e5e3b`, MEDIUM `#f6ecd8`/`#8a5a1a`. Null category = "—"
  `#b0a996`.
- Clean rules: pill chips `#eef4ef`, 1px `#d3e2d6`, `#2e5e3b`, "✓" + mono id
  + short title.

### 5.7 Lecture report page
- Header: breadcrumb; h1 + priority badge; metadata pills; overall score card.
- Score breakdown: auto-fit minmax(200px,1fr) cards — label/score row, 4px
  bar, 12px note. N/A: score "N/A" `#b0a996`, empty bar.
- Issues: filter chip row right of the section heading — `All · 11`,
  `Critical · 1`… (active: `#14243c` bg white text; inactive: white,
  1px `#ddd8cc`). Issue card: white, 4px left border in severity color,
  radius 10; header row = severity tag (CRITICAL `#8c2f24`/`#f6e5e2`, HIGH
  `#a63a2e`/`#f8ebe8`, MEDIUM `#8a5a1a`/`#f6ecd8`, LOW `#6b5d34`/`#f2edd7`) +
  mono rule id `#17538f` + 14.5px/700 title + right `×N`; body example
  13.5px; footer `lines 499, 549` mono 11.5px `#8a8577`.
- Strengths: `#fbfdfb` cards, 1px `#dbe8dd`, green ✓, 13.5px `#33513c`.
- Actions: numbered list cards (24px navy circle).

### 5.8 Charts page (native, replaces matplotlib PNGs)
- Heatmap: grid `130px repeat(7,1fr)` gap 5; cells radius 6, min-height 44,
  13px/600 tabular values; color = oklch ramp over score 4→10:
  `oklch(L C H)` with `t=(v-4)/6`, `H = 25+120t`, `C = 0.09`,
  `L = 0.62+0.13t`; N/A `#e8e4da`/`#8a8577`. Gradient legend bar 4→10 + N/A
  swatch.
- Rule reach: rows `130px 1fr 44px`; 16px bars, registry `#2c72b8`,
  proposed `#8ea8c4` (id suffixed `*`); `title=` tooltip with rule title.
- Priority mix: per-series 24px stacked bars, counts inline when segment
  wide enough; legend beneath.
- Category averages: 220px column chart; dashed threshold lines at 8.6
  (`#6fa87d`, "NONE ≥ 8.6") and 5.0 (`#c0574a`, "HIGH ≤ 5.0"); bar color by
  band (`#c0574a` / `#d9a94e` / `#6fa87d`); value labels above bars.

## 6. Design tokens

Add to `tailwind.config.js` under a `qec-` (compliance) namespace:

```
Surfaces   paper #faf9f6 · card #ffffff · line #e7e3d9 · line-soft #f1ede4
           track #eeeade · hover #f4f2ec
Ink        ink #1c2534 · navy #14243c · body #414b5c · muted #6a7180
           faint #8a8577 · ghost #b0a996
Accent     blue #2c72b8 · link #17538f · link-hover #0d3a66
           (align with existing qeborder-blue rgb(0,114,188) if preferred —
           pick ONE blue family and use it consistently)
Status     red #a63a2e · red-deep #8c2f24 · amber #c07a1d · gold #6b5d34
           green #3e7d4f · green-deep #2e5e3b · merged-purple #7d5bb5
Tints      red #f6e5e2 / #f8ebe8 / #fdf7f5 · amber #f6ecd8 / #faf1e4
           gold #f2edd7 / #f0ece2 · green #e8f0e9 / #eef4ef / #e5efe7
           blue #eef2f7 / #eceef4 · purple #f1ecf8
Bands      reach: #173f6d / #2c72b8 / #5f8fc2 / #96b3d2 (≥75/60/45/30%)
Type       display: 'Source Serif 4' serif · body: Source Sans 3 Variable
           mono: 'IBM Plex Mono'
Radii      pill 999 · card 10–12 · chip 4–6 · bar 2–3
```

## 7. Interactions & behavior

- **Ranked table sorting**: click a column header to sort ascending, click
  again to toggle. Active column shows ▲/▼ and `#17538f`; inactive `#8a8577`.
  Nulls always sort last. Client-side state only.
- **Issue filter chips**: single-select All/Critical/High/Medium/Low with
  live counts; filters the card list. Client-side state only.
- **Hovers**: table rows `#f4f2ec`; cards border-darken; nav items `#f1efe8`;
  links underline on hover only.
- **Links**: `a { color:#17538f }`, hover `#0d3a66` underline (extend the
  existing typography config in tailwind.config.js).
- **Responsive**: main padding `clamp(20px,4vw,56px)`; wins/breakdown/nav-card
  grids `auto-fit minmax`; finding cards flex-wrap so the issue card drops
  below the description at narrow widths; ranked table horizontal-scrolls
  inside its card; two-column trend lists stack via
  `auto-fit minmax(340px,1fr)`. **No page-level horizontal overflow at any
  width ≥ 360px** — this was the main defect class found while prototyping;
  add a Playwright check (the repo already has the visual harness).
- Everything must work with JS disabled except sorting/filtering (progressive
  enhancement: default sort order and unfiltered list render server-side).

## 8. Out of scope (this phase)

- Rewriting report *content* — the compliance repo's `.md` files migrate
  their `<!-- qe: -->` marker blocks to directives, but prose is untouched.
- Dark mode (the base theme supports `darkMode: 'class'`; compliance tokens
  should be defined with a dark variant slot but light-only shipping is fine).
- Thebe/live compute and notebook launch on compliance pages (inert —
  simply not configured).

## 9. Acceptance criteria

1. `myst start` in compliance-lecture-style (post-migration) renders all five
   page types matching the bundled references: landing/triage, series report,
   lecture report, charts, plus restyled admonitions everywhere.
2. All chart/table numbers come from `lectures/data/*.csv` at build time;
   deleting a CSV fails the build loudly.
3. Existing lecture-theme consumers see zero visual change from the same
   release (visual-regression suite passes untouched).
4. Sorting, filtering, and responsive behavior per §7; no horizontal overflow
   ≥ 360px.
5. Both zips (`lecture`, `compliance`) build via the release workflow.

## 10. Files in this bundle

- `Compliance Report Theme.dc.html` — landing/triage page (flagship reference)
- `Series Report.dc.html` — series report (lecture-python-programming data)
- `Lecture Report.dc.html` — per-lecture report (python_by_example data)
- `Charts.dc.html` — native charts page
- `support.js` — runtime the references need to render; open the HTML files
  next to it in a browser. The `<x-dc>` markup + `class Component` script in
  each file contain the exact inline styles and component data shapes.
