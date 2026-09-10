# The compliance data contract

*Every file the compliance plugin reads from `compliance-lecture-style`, what each column
holds, what a missing value means, and the three gaps that need the ledger's tooling to
change. Co-signed with the ledger under QuantEcon/compliance-lecture-style#29.*

Last updated: 2026-09-10 · Status: draft, pending the ledger's sign-off

Everything below was **measured against the files**, not read off the design brief. Where the
brief and the ledger disagree, the ledger wins and the disagreement is recorded, because the
brief is wrong in several places and those errors are the reason this document exists.

Measured against `compliance-lecture-style` at the 2026-08 pass: 348 lectures across five
series, pinned per series in `lectures/data/snapshot.json`.

## How the plugin finds a file

A `:file:` path resolves against the **project root** — the directory found by walking up from
the source file until a `myst.yml` is met — and never above it. The ledger's data therefore
sits at `lectures/data/…` in every directive, whatever depth the page is at. A path that
escapes the root is refused, lexically and through a symlink.

**Every file in `lectures/data/` is CRLF-terminated.** That is Python's `csv` module writing
its default dialect, not an accident of an editor, so it will persist across passes. A reader
that splits on `\n` leaves a trailing `\r` on the last field of every row, silently turning
`HIGH` into `HIGH\r` and breaking every badge lookup. The datavis toolchain's own reader
treats `LF`, `CRLF` and a lone `CR` as one record break and is unaffected; this is recorded so
that no one later "fixes" the ledger to write LF, and so that any other consumer knows.

## Sentinels: three spellings, two meanings, and one that is neither

This is the crux of the contract, and the design brief states it wrongly. The brief says an
empty cell means "category not in scope". No file uses an empty cell that way.

| Token | Where | Count | Means |
| --- | --- | --- | --- |
| `N/A` | `scores.csv`, `scores_mechanical.csv` | 263 each | **Not applicable to this lecture.** There is nothing of this kind here to score — no maths, three code cells or fewer, no figure, no citation, no admonition. Never zero, never unmeasured |
| `out-of-scope` | `scores.csv`, `scores_mechanical.csv`, `jax` column only | 348 each | **Never in the audit's remit.** The seven `qe-jax-*` rules target a repository outside this corpus |
| empty | `series_summary.csv`, `history.csv`, `history_mechanical.csv` | 1, 2, 2 | **A mean computed over zero in-scope values.** An aggregate, not a scope flag |

`N/A` occurs in five columns: `references` 97, `admonitions` 81, `math` 33, `figures` 30,
`code` 22. `out-of-scope` occurs in exactly one column, in 100% of its rows.

Three consequences the plugin must honour.

**`N/A` and `out-of-scope` are genuinely distinct and the ledger says so.** `spec.md` states
that out-of-scope "is distinct from `N/A` (not applicable to this lecture)". The datavis
contract has **one** vocabulary for a missing value — every spelling of nothing becomes `null`
and renders as an em dash — so a primitive cannot carry the distinction in the value. It goes
in a **second property**, per the family rule "a primitive that wants to distinguish absent
from out of scope does it with a second property, not a second spelling of nothing".

**An empty aggregate must never be coerced to `0`.** On a 0–10 scale zero is the most severe
score, so coercing would paint a category red for having nothing to measure. It renders in its
own visual state, as the brief's `N/A` treatment does.

**The CSV token is hyphenated; the published report prose is not.** `out-of-scope` in the file,
"out of scope" in the markdown. A consumer matching the prose string will match nothing.

### Sentinels that are the absence of a row

`violations.csv`, `judgment.csv` and `lecture_blobs.csv` contain **no in-cell sentinel at all**:
across 4,372 rows there is not one empty cell, and every numeric column parses as an integer.
Every "nothing here" in those files is a **missing row**, and a missing row is ambiguous:

- No `(series, lecture, rule)` row in `violations.csv` — the rule was checked and found nothing.
  Not "out of scope".
- A lecture absent from `violations.csv` entirely — a clean lecture. Twelve exist. All are
  present in `scores.csv` and `lecture_blobs.csv`, which is how they are detected: **348
  lectures are scored, 279 distinct stems appear in violations, and the roster is `scores.csv`,
  never `violations.csv`.** A gate that requires every finding to resolve to a violations row
  has twelve false positives built in.
- A rule absent from `violations.csv` — **21 of the 56 titled rules never appear**, for three
  different reasons: checked with zero hits, judgment-only (8 rules, no detector exists), or
  out of the corpus (7 `qe-jax-*`). `snapshot.json` carries `n_rules_checked: 41`, which is the
  only place the mechanically-checked set is pinned.

**The rule universe has three tiers and no CSV distinguishes them: 56 titled, 41 checked, 35
with hits.** Any "rules checked" figure the report states from the CSVs alone will be 35 or 56
and wrong. See *Open questions*, item 1.

## The files

Row counts are the 2026-08 pass.

### Scores

| File | Rows | Purpose |
| --- | ---: | --- |
| `scores.csv` | 348 | Per-lecture category scores after the review overlay. Drives the report's score breakdown |
| `scores_mechanical.csv` | 348 | The same shape, before the overlay — the scanner's own numbers |
| `series_summary.csv` | 6 | Five series plus a `TOTAL` row. Drives the series pages |

Columns of both score files: `series, lecture, writing, math, code, jax, figures, references,
links, admonitions, overall, priority`. **The `jax` column is not in the design brief** and must
be handled: it is `out-of-scope` in all 348 rows today. `priority` is the closed set `HIGH`,
`MEDIUM`, `LOW`, `NONE`.

### Violations and review

| File | Rows | Purpose |
| --- | ---: | --- |
| `violations.csv` | 2,376 | `series, lecture, rule, count, proposed, build_risk`. Mechanical detections |
| `judgment.csv` | 1,648 | `series, lecture, rule, count`. The reviewer's findings — **a lossy projection, see below** |
| `lecture_blobs.csv` | 348 | `series, lecture, blob`. Provenance: the git blob each score was computed against |
| `reviews/<series>/<lecture>.json` | 348 files | The reviewer's full overlay. **Not under `lectures/data/`** |

`build_risk` is a 0/1 flag, set on **6 rows**, and it is rule-level rather than
occurrence-level: the two build-risk rules are `qe-math-006` and `qe-admon-003`. `proposed`
marks a rule specified in the QuantEcon manual style guide but not yet encoded in
`action-style-guide`; it is likewise rule-level.

### Reach and history

| File | Rows | Purpose |
| --- | ---: | --- |
| `rule_reach.csv` | 35 | `rule, category, lectures_affected, total_occurrences, proposed`. Corpus-wide reach |
| `series_rule_reach.csv` | 139 | `series, rule, lectures_affected, total_occurrences` |
| `rule_reach_history.csv` | 70 | `period, corpus_size, rule, lectures_affected, total_occurrences, share_pct`. **Six columns — the brief says three** |
| `rule_titles.csv` | 56 | `rule, title, proposed`. The rule vocabulary |
| `history.csv` | 12 | Per-period, per-series means, plus `reviewed`. 16 columns |
| `history_mechanical.csv` | 12 | The same before the overlay. 15 columns, no `reviewed` |
| `snapshot_history.csv` | 10 | `period, series, basis, commit, committed, lectures, checker`. Provenance per period |
| `snapshot.json` | — | `n_lectures`, `n_rules_checked`, `per_series`, and the pinned commit and date per series |
| `fig_line_widths.csv` | 27 | `key, kind, calls, lectures`. Not named in the brief; no designed region needs it |

**`share_pct` is fully derived**, `round(100 × lectures_affected / corpus_size, 1)`, and the
identity holds for all 70 rows. The plugin should **trust the value and assert the identity**,
failing the build on a mismatch, rather than recompute — recomputing invites a rounding
divergence between Python and JavaScript that would put a different number on the page than in
the published markdown.

**`TOTAL` is a pseudo-series appearing in three files**: `series_summary.csv` (1 row),
`history.csv` (2) and `history_mechanical.csv` (2), and not in `snapshot_history.csv`. It is a
corpus-wide mean over all lectures, **not** the mean of the series rows above it, so it cannot
be recomputed and must never be averaged into a per-series chart.

**`snapshot.json` is JSON, and the datavis `:file:` reader takes CSV only.** `compliance.mjs`
is a separate bundle and may read it with `JSON.parse` directly; nothing needs to change in the
datavis family.

## The blocking finding: issue-card prose

The design brief says issue lines and example text exist only in the generated markdown. That
is right about the CSVs and wrong about the ledger, and the difference splits the work in two.

**The reviewer half is recoverable.** `reviews/<series>/<lecture>.json` — 348 files, one per
lecture — carries `judgment[{rule, count, lines, detail}]` plus `strengths[]`, `actions[]`,
`scanner_doubts[]` and a `source{commit, blob}` stamp. `detail` is exactly the prose an issue
card needs, with line numbers and inline code. `tools/qestyle_draft.py` writes
`judgment.append((series, stem, rule, v["count"]))` — **`lines` and `detail` are dropped on the
way to `judgment.csv`.**

**So: the compliance plugin reads `reviews/`, not `judgment.csv`.** No change to the ledger's
tooling is needed for the reviewer half, and `judgment.csv` stays as it is for
`qestyle_check.py`.

**The mechanical half is not recoverable.** For the mechanical findings the equivalent `lines`
and example text are produced live by the lexer at draft time and persisted nowhere in the
repository. `qestyle_scan.py --evidence` can write them and the runbook already passes that
flag, but the output is deliberately kept outside the ledger. **Either that evidence is
committed, or the report's mechanical issue cards carry a rule title and a count and no
example.** That is a decision for the ledger maintainers and is the first item below.

## `findings.csv` — the file that does not exist yet

Decision D4 makes the pass tooling write it, so the fix-immediately cards can show issue and
pull-request state without a build-time GitHub call — the ledger is built on pinned-snapshot
reproducibility and a live API call would break it.

Proposed columns, extending the brief's `where, rule, issue_url, issue_state, pr_url, pr_state,
checked_at`:

| Column | Holds |
| --- | --- |
| `series`, `lecture` | The location, split rather than a single `where`, so it joins to `scores.csv` |
| `lines` | Semicolon-separated line numbers, possibly empty. At least one published card carries two |
| `rule` | A rule id where one applies. **Two of the four published cards carry free text instead**, so this column cannot be constrained to `rule_titles.csv` |
| `severity` | The card's own tone. **Not derivable**: `severity()` returns `Critical` only for a rule in `BUILD_RISK`, and the published cards include rules that are not, so severity must be recorded rather than computed |
| `issue_url`, `issue_title`, `issue_state` | `open`, `closed`, `not_planned`, `none`, `unknown` |
| `pr_url`, `pr_title`, `pr_state` | `open`, `merged`, `closed`, `none`, `unknown` |
| `checked_at` | ISO 8601 with offset, matching `snapshot_history.csv`'s `committed` |
| `synced_from` | Where a finding is a copy carried across series; empty when native |

**No empty-cell sentinels in a state column.** `none` means nothing was filed — a positive
statement. `unknown` means a URL exists but the fetch failed, and must never be written over a
previously good value. `0`, `-`, `N/A`, `TBD` and `—` are all rejected by the gate.

**Staleness.** `checked_at` exists because the state is a snapshot and the pass cadence is
roughly quarterly. Recommended: render the date always; above 90 days old, render an amber note
on the section as a whole and drop the state badges to neutral rather than the confident
green and purple; older than the previous period's pin, or absent, and `qestyle_check.py`
fails. A card asserting MERGED from two passes ago is worse than no card.

**Where the network step goes.** Writing this file needs a GitHub call, which the pass did not
previously make. It belongs as its own step in `UPDATE.md` after the scan and before the
report splice, so that a failed or rate-limited fetch leaves the previous values in place
rather than blocking the pass.

## The directive syntax sheet

The compliance wrappers take the container-and-item form, as a stated exception to the datavis
family rule, and **the gated form wherever a card body may hold a `code-cell`**. Both are
specified in `CONTRACT.md` under *Classed cards and grids*; the gated form is specified under
*Gated containers* and follows `qe-admon-001`, the ledger's own rule for executable code.

| Directive | Argument | Options | Body | Data read from |
| --- | --- | --- | --- | --- |
| `{qe-wins}` / `{qe-wins-start}` … `{qe-wins-end}` | section title | `:layout:` | the cards | — |
| `{qe-win}` | the win's title | `:rule:`, `:effort:` | description | `rule_reach.csv`, `series_summary.csv` |
| `{qe-issues}` / `{qe-issues-start}` … `{qe-issues-end}` | section title | the container's `filter` — option name not yet fixed in `CONTRACT.md` | the cards | — |
| `{qe-issue}` | the issue's title | `:severity:`, `:rule:`, `:count:`, `:lines:` | example prose | `violations.csv`, `reviews/` |
| `{qe-findings}` / `{qe-findings-start}` … `{qe-findings-end}` | section title | — | the cards | — |
| `{qe-finding}` | the location | `:rule:` | problem statement | `findings.csv`, `snapshot.json` |

**Numbers are read and derived, never typed.** `:reach:` is refused outright; a count typed for
readability is checked against the CSV and a mismatch is a build error. This is the ledger's
own discipline, and it is what makes the goal "the visuals cannot drift from the measured data"
hold without a separate verification step.

## Open questions for the ledger maintainers

1. **Mechanical issue-card prose.** Commit the `--evidence` output, or accept mechanical cards
   with no example text? This is the only question that blocks a designed region.
2. **A `checked` column on `rule_titles.csv`.** The scanner already knows which rules it runs,
   so it is a one-line change, and it is the only way the report can state "41 rules checked"
   rather than 35 or 56 — and the only way a "clean on this rule" claim stops crediting a
   series for seven rules no detector has run.
3. **`spec.md` contradicts itself on JAX.** One passage says to use `N/A` for the JAX category
   in non-JAX lectures; another says reports mark JAX out of scope, distinct from `N/A`. The
   code follows the second, unconditionally. One of the two sentences should be retired,
   because the answer decides whether `jax` can stay a constant.
4. **`share_pct`: assert or recompute?** The recommendation above is to assert. The maintainers
   should confirm they are content for the theme to fail a build on a mismatch.
5. **`findings.csv` severity.** Confirm that severity is recorded by the pass rather than
   computed, given that the published cards include a rule outside `BUILD_RISK`.

## Sources

- `compliance-lecture-style` at the 2026-08 pass: `lectures/data/`, `reviews/`, `tools/`,
  `lectures/spec.md`, `UPDATE.md`
- The design brief and review in [`docs/design-handoff-2026-09/`](design-handoff-2026-09/)
- The node contract in
  [`quantecon-plugins.mystmd`](https://github.com/QuantEcon/quantecon-plugins.mystmd/blob/main/CONTRACT.md)
