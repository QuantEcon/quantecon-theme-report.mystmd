# Security

## Reporting a vulnerability

Please report security issues privately via GitHub's
["Report a vulnerability"](https://github.com/QuantEcon/quantecon-theme-report.mystmd/security/advisories/new)
flow rather than opening a public issue.

## Dependency security posture

This theme is **deliberately pinned to Remix v1.17** (`@remix-run/*` `~1.17.0`), the same
pin the lecture theme carries and for the same reason. Remix 1.19+ hard-reloads the client
when `window.__remixContext.url` is undefined — which it always is under the mystmd CLI's
SSR — producing an infinite reload loop and breaking in-page navigation (see the comment
block in [`.npmrc`](.npmrc)). Most upstream Remix security advisories are patched only in
the **v2** line, so they cannot be resolved without a major migration that re-introduces
that regression. This is a conscious trade-off, inherited with the scaffold and re-triaged
below against this repository's own dependency tree.

Where a vulnerable **transitive** dependency has a backward-compatible patched release, we
pull it forward with an
[`overrides`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides) entry
in [`package.json`](package.json) rather than bumping a major version of the toolchain.
Current overrides, each verified to resolve in this tree:

| Package | Forced to | Reason |
| ------- | --------- | ------ |
| `prismjs` | `^1.30.0` | ReDoS / prototype-pollution advisories |
| `katex` | `^0.16.21` | matches the rendered KaTeX (vs the CDN's 0.15) |
| `uuid` | `^11.1.1` | GHSA-w5hq-g745-h8pq |
| `ajv` | `^8.18.0` | GHSA-2g4f-4pwh-qvx6 |
| `cookie` | `^0.7.0` | GHSA-pxg6-pf52-xh8x (used via Remix's cookie session) |
| `shell-quote` | `^1.10.0` | GHSA-w7jw-789q-3m8p (dev; via `concurrently`) |
| `brace-expansion@^1.0.0` | `^1.1.18` | GHSA-3jxr-9vmj-r5cp / GHSA-mh99-v99m-4gvg / GHSA-rgw5-rvv9-x895 — ReDoS-style DoS via exponential expansion; two majors coexist in the tree, so the override is version-scoped |
| `brace-expansion@^5.0.0` | `^5.0.9` | same advisory family. Inherited from the lecture theme and currently **inert** — no 5.x copy resolves in this tree — kept as a forward guard so a future dependency bump cannot reintroduce one silently |
| `js-yaml@^3.0.0` | `^3.15.0` | GHSA-52cp-r559-cp3m / GHSA-h67p-54hq-rp68 — quadratic CPU consumption via YAML merge-key chains |
| `js-yaml@^4.0.0` | `^4.3.0` | same advisories, 4.x copy |
| `@babel/core` | `^7.29.6` | GHSA-4x5r-pxfx-6jf8 — arbitrary file read via `sourceMappingURL` comment (low; build-time) |

Two of the lecture theme's overrides are **not** carried across, having been re-checked
against this tree:

- **`ws`** — the lecture theme scopes an override to the 8.x copies. Here both copies
  (`7.5.13`, `8.21.3`) are already above their patched floors and `npm audit` raises
  nothing against them, so no override is needed.
- **`sanitize-html`** — the lecture theme pins `2.17.5` exactly for GHSA-vccv-cmxp-4j9h.
  Forcing that version here was tested and does **not** clear the package's advisories
  (the SVG SMIL scheme-policy bypass is not fixed at 2.17.5 either), and it raises the
  total alert count by pulling more paths onto the forced copy, so the override is omitted
  and the advisory is deferred with the rest of the Jupyter chain below.

`npm audit fix` (without `--force`) is a **no-op** for this tree: every remaining advisory
needs either a major bump or a manual override.

## Triage of open alerts

Snapshot as of **2026-09-03**, taken from `npm audit` against the committed lockfile:
**69 advisories (5 critical, 16 high, 44 moderate, 4 low)**. Re-evaluate when the theme
migrates off Remix v1.

Every alert is accounted for below. When adding a deferral here, name the **package** —
the buckets are matched by package, so an advisory whose package appears nowhere in this
section is an untriaged one, not an implicitly-deferred one.

### Deferred — patched only beyond Remix v1 (intentionally not adopted)

The migration off Remix v1 is upstream-first and gated on `jupyter-book/myst-theme`; the
lecture theme tracks it in
[quantecon-theme.mystmd#28](https://github.com/QuantEcon/quantecon-theme.mystmd/issues/28)
and retargeted it from Remix v2 to **React Router 7** in June 2026. This theme moves when
that does.

| Package(s) | Severity | Status |
| ---------- | -------- | ------ |
| `@remix-run/node`, `@remix-run/vercel`, `@remix-run/express`, `@remix-run/serve` (GHSA-9583-h5hc-x8cw / CVE-2025-61686) | critical | **Not applicable** — path traversal in *file*-backed session storage (`createFileSessionStorage`), which this theme does not use. The theme's only session is the cookie-backed colour-mode session (`createCookieSessionStorage`, via `@myst-theme/site`'s `getThemeSession` in `app/root.tsx`). |
| `@remix-run/react`, `@remix-run/server-runtime`, `@remix-run/router`, `react-router`, `react-router-dom` | high | Patched only in Remix v2 / react-router 6.30+ or 7.18+. `@remix-run/react@1.17` exact-pins `react-router-dom@6.13.0` and `@remix-run/router@1.6.3`, which ship paired internal APIs, so the routers cannot be pulled forward independently. Deferred with the v1 pin. |
| `@remix-run/dev` and its build chain — `esbuild`, `vite`, `vite-node`, `@vanilla-extract/integration`, `estree-util-value-to-estree`, `remark-mdx-frontmatter`, `cacache`, `tar` | high/critical | Build-time only, and every fix is `@remix-run/dev@2.x`. The `tar` criticals (the 2026 node-tar path-traversal batch) are fixed only in tar 7.5.x, which `@remix-run/dev@1.17`'s `cacache` chain cannot take. |
| `@tootallnate/once`, `proxy-agent`, `pac-proxy-agent`, `pac-resolver`, `http-proxy-agent`, `get-uri`, `ip` | low/high | The proxy-agent chain nested under `@remix-run/dev`. `ip` is unmaintained and has **no patched release** at all; the rest move with `@remix-run/dev`. Dev-time only. |

### Deferred — major bump in the MyST render chain

Transitive dependencies of `@myst-theme/site` / `myst-to-react`. Their fixes are
major-version bumps with a high regression risk and low real exposure for a statically
built report site, so they are deferred until the relevant upstream ships them.

| Package(s) | Severity | Status |
| ---------- | -------- | ------ |
| `markdown-it` (13→14) and `linkify-it` | high | Quadratic-complexity DoS. `linkify-it` reaches the tree only as a `markdown-it` dependency, so it moves when `markdown-it` does. Both are build-time: content is rendered to AST by the `myst` CLI, not by the deployed site. |
| `nanoid` | high | Two copies (3.x, 4.x) reach the tree under `myst-to-react`; fixes are 3.3.8+/5.x, and the 4.x line has no fix. |
| `myst-demo`, `myst-to-html`, `myst-to-jats`, `myst-transforms`, `myst-parser`, `@myst-theme/site` | moderate | Flagged only because they depend on the two above. |
| `sanitize-html` and the `@jupyterlab/*` / `@jupyter-widgets/*` / `thebe-*` chain | moderate | Present **transitively** via `myst-to-react`'s demo/renderer dependencies, even though this theme ships no live-compute UI and never mounts a Jupyter widget. The fix is `@jupyterlab/apputils` majors; see the `sanitize-html` note above for why the lecture theme's exact pin is not carried across. |
| `qs`, `body-parser`, `express` | moderate | In the *bundle's* server (`template/package.json` → `@remix-run/express`), not in this repository's build. `npm audit fix` clears them; they are refreshed whenever the template's lockfile is regenerated at release time. |

### Deferred — dev-only Vercel adapter

| Package | Severity | Status |
| ------- | -------- | ------ |
| `@vercel/node` (via `esbuild`, `path-to-regexp`) | high | Present only because `server.js` uses `@remix-run/vercel`. The fix is `@vercel/node@12`, a major bump; nothing in the published bundle uses it (the release zip ships `template/server.js`, an Express server). Removing the Vercel adapter entirely is worth considering with the Phase 2 shell (#6). |
