import type { LinksFunction, V2_MetaFunction, LoaderFunction } from '@remix-run/node';
import tailwind from '~/styles/app.css';
import { SourceSans3CSS } from '~/links';
import { getConfig } from '~/backend/loaders.server';
import type { SiteLoader } from '@myst-theme/common';
import {
  Document,
  responseNoSite,
  getMetaTagsForSite,
  getThemeSession,
  ContentReload,
  SkipTo,
  renderers as defaultRenderers,
} from '@myst-theme/site';
import { Outlet, useLoaderData } from '@remix-run/react';
import type { NodeRenderers } from '@myst-theme/providers';
import { mergeRenderers } from '@myst-theme/providers';
export { AppErrorBoundary as ErrorBoundary } from '@myst-theme/site';

/**
 * Node renderers.
 *
 * Phase 0 ships the stock `myst-to-react` set only. The report-specific
 * renderers — the eight data-presentation primitives and the compliance card
 * upgrades — are added here in Phase 2/3 (issues #7 and #8), which is why this
 * indirection exists now rather than passing `defaultRenderers` straight
 * through.
 */
const RENDERERS: NodeRenderers = mergeRenderers([defaultRenderers]);

export const meta: V2_MetaFunction<typeof loader> = ({ data }) => {
  return getMetaTagsForSite({
    title: data?.config?.title,
    description: data?.config?.description,
    twitter: data?.config?.options?.twitter,
  });
};

/**
 * Critical CSS — inlined in <head> to fix the Safari/WebKit FOUC on navigation
 * (carried across from the lecture theme, which found it in
 * QuantEcon/quantecon-theme-src#66).
 *
 * Static builds (`myst build --html`) navigate via full document loads, and
 * WebKit paints the freshly-navigated document for ~1 frame BEFORE any <link>
 * stylesheet applies — even the same-origin Tailwind app.css. That frame shows
 * the default serif font and the content grid collapsed to `display: block`
 * (i.e. the "raw HTML" flash users report). An inline <style> is parsed
 * synchronously with the document, so it styles that very first paint with no
 * network round-trip.
 *
 * Every selector is wrapped in `:where(...)` so these rules carry **zero**
 * specificity: they take effect only while nothing else has loaded, and the
 * real stylesheet (Tailwind preflight + @myst-theme/styles) always wins once it
 * arrives. This keeps the inline block from overriding the live cascade despite
 * being emitted after <Links /> in the document head.
 *
 * Because these rules carry no specificity, every property set here MUST also
 * be declared by the real stylesheet, otherwise it can never be overridden.
 *
 * Keep the values in sync with their sources of truth:
 *   - font stack:    tailwind.config.js  -> theme.extend.fontFamily.sans
 *                    The `@font-face` rules for "Source Sans 3 Variable" are
 *                    self-hosted via app/links.ts, so they arrive in a <link>
 *                    and are NOT available at this first paint. The
 *                    `sans-serif` tail is what renders here and the webfont
 *                    swaps in once that stylesheet lands.
 *   - grid columns:  tailwind.config.js  -> theme.extend.gridTemplateColumns
 *                    (`simple-sm` / `simple-xl`), applied by `.simple-center-grid`
 *   - dark bg:       matches the page <body>, which @myst-theme/site renders as
 *                    `dark:bg-stone-900` (#1c1917) — note the <body> tag lives in
 *                    that upstream Document, not in this file
 *
 * The lecture theme also parks its off-canvas contents sidebar off-screen here.
 * This theme has no nav panel yet; when the Phase 2 shell (#6) adds one, the
 * `translateX(-100%)` rule and its guard in `tests/visual/fouc.spec.ts` come
 * across with it.
 */
const CRITICAL_CSS = `
:where(html){font-family:"Source Sans 3 Variable","Source Sans 3",sans-serif}
:where(body){margin:0;background-color:#fff}
:where(.dark body){background-color:#1c1917}
:where([hidden],.hidden){display:none}
:where(.simple-center-grid){display:grid;grid-template-columns:[screen-start] 1fr [body-start] minmax(300px,800px) [body-end] 1fr [screen-end]}
:where(.simple-center-grid) > *{grid-column:body-start / body-end}
@media (min-width:1280px){:where(.simple-center-grid){grid-template-columns:[screen-start] 1fr 200px 20px [body-start] 800px [body-end] 20px [margin-start] 200px [margin-end] 1fr [screen-end]}}
`;

export const links: LinksFunction = () => {
  return [
    {
      rel: 'icon',
      href: '/favicon.ico',
    },
    // Self-hosted Source Sans 3 (see app/links.ts). Declared on the *root*
    // route rather than the page routes like KatexCSS, because root's links()
    // are the only ones that also apply when the root ErrorBoundary renders —
    // a 404, or the missing-site response thrown below — and the body font has
    // to be right on those pages too.
    ...SourceSans3CSS,
    { rel: 'stylesheet', href: tailwind },
    { rel: 'stylesheet', href: '/myst-theme.css' },
  ];
};

export const loader: LoaderFunction = async ({ request }): Promise<SiteLoader> => {
  const baseURL = process.env.BASE_URL || undefined;
  const [config, themeSession] = await Promise.all([
    getConfig().catch(() => null),
    getThemeSession(request),
  ]);
  if (!config) throw responseNoSite();
  const data = {
    theme: themeSession.getTheme(),
    config,
    CONTENT_CDN_PORT: process.env.CONTENT_CDN_PORT ?? 3100,
    MODE: (process.env.MODE ?? 'app') as 'app' | 'static',
    BASE_URL: baseURL,
  };
  return data;
};

export default function AppWithReload() {
  const { theme, config, CONTENT_CDN_PORT, MODE, BASE_URL } = useLoaderData<SiteLoader>();

  return (
    <Document
      theme={theme}
      config={config}
      scripts={MODE === 'static' ? undefined : <ContentReload port={CONTENT_CDN_PORT} />}
      staticBuild={MODE === 'static'}
      baseurl={BASE_URL}
      renderers={RENDERERS}
      top={0}
      // dangerouslySetInnerHTML is required, not incidental: CRITICAL_CSS uses a
      // child combinator (`.simple-center-grid > *`), and React escapes `>` to
      // `&gt;` in <style> text children during SSR. Browsers don't decode entities
      // inside <style>, so `<style>{CRITICAL_CSS}</style>` would emit an invalid
      // selector and silently drop the body-column rule. Keep this as-is.
      head={<style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />}
    >
      <SkipTo targets={[{ id: 'skip-to-article', title: 'Skip to report content' }]} />
      <Outlet />
    </Document>
  );
}
