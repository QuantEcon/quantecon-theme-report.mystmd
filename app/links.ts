import type { HtmlLinkDescriptor } from '@remix-run/react';
import katexCss from 'katex/dist/katex.min.css';
// Explicit `.css` subpaths, not the bare specifier: the package ships its own
// `index.d.css.ts` (`export {}`), which would win over Remix's
// `declare module "*.css"` and fail `npm run compile`.
import sourceSans3Css from '@fontsource-variable/source-sans-3/index.css';
import sourceSans3ItalicCss from '@fontsource-variable/source-sans-3/wght-italic.css';

/**
 * Self-hosted KaTeX stylesheet.
 *
 * Replaces the `KatexCSS` export from `@myst-theme/site`, which points at
 * `cdn.jsdelivr.net`. Two reasons to serve it ourselves:
 *
 *   1. Accessibility. jsdelivr is intermittently unreachable from mainland
 *      China, where a significant share of QuantEcon readers are. When it is
 *      blocked the maths markup still renders but is completely unstyled, so a
 *      report's derived figures become unreadable.
 *   2. The critical path. It was a render-blocking stylesheet on a third
 *      origin, so first paint waited on a DNS lookup and TLS handshake.
 *
 * Remix fingerprints this import and emits it, plus the font files it
 * references, into `public/build/_assets/` — served at `/myst_assets_folder/`
 * (remix.config.*.js `publicPath`), the same path as every other bundled asset.
 *
 * The upstream export also pins KaTeX 0.15.2 while this repo resolves 0.16.x;
 * importing from the package keeps the CSS aligned with the installed version.
 *
 * Carried across from the lecture theme (`quantecon-theme.mystmd`) with the
 * scaffold — see CONTRIBUTING.md "Relationship to the lecture theme".
 */
export const KatexCSS: HtmlLinkDescriptor = {
  rel: 'stylesheet',
  href: katexCss,
};

/**
 * Self-hosted Source Sans 3 (variable).
 *
 * Same two reasons as KaTeX above, both sharper here: Google Fonts is blocked
 * in mainland China, and this is the *body* font on every page. An `@import`
 * from `styles/app.css` would also be the worst shape a critical-path request
 * can have — discovered only once `app.css` has downloaded and parsed, so it
 * cannot be preloaded.
 *
 * The import lives here rather than in `styles/app.css` because Tailwind does
 * not rebase `url()` inside an `@import`ed stylesheet — the font paths would be
 * emitted relative to the Tailwind *output* file and 404. Imported from a
 * module, Remix's esbuild pass rewrites them and emits the woff2 files into
 * `public/build/_assets/`. (Those emitted URLs are then made stylesheet-relative
 * by `scripts/relative-css-asset-urls.mjs`, without which they resolve only
 * under `myst start` and not in static builds.)
 *
 * Two stylesheets, not one: the package splits upright from italic, and report
 * prose uses both. Without the italic faces the browser synthesises an oblique
 * from the upright, which measures wider and shifts the layout.
 *
 * The family is declared as `Source Sans 3 Variable`, which is why
 * `tailwind.config.js` and the inlined `CRITICAL_CSS` in `app/root.tsx` name it
 * that way too — those three have to stay in step.
 */
export const SourceSans3CSS: HtmlLinkDescriptor[] = [
  { rel: 'stylesheet', href: sourceSans3Css },
  { rel: 'stylesheet', href: sourceSans3ItalicCss },
];
