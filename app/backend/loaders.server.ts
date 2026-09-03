/*
 * Server-side loaders: fetch the MyST content server's config and page JSON.
 * Copied from the lecture theme (quantecon-theme.mystmd) with the Phase 0
 * scaffold, trimmed to the routes this theme serves.
 */
import fetch from "node-fetch";
import type { SiteManifest } from "myst-config";
import {
  type PageLoader,
  getFooterLinks,
  getProject,
  updatePageStaticLinksInplace,
  updateSiteManifestStaticLinksInplace,
} from "@myst-theme/common";
import { redirect } from "@remix-run/node";
import {
  responseNoArticle,
  responseNoSite,
  getDomainFromRequest,
} from "@myst-theme/site";
import { slugToUrl } from "myst-common";

const CONTENT_CDN_PORT = process.env.CONTENT_CDN_PORT ?? "3100";
const CONTENT_CDN =
  process.env.CONTENT_CDN ?? `http://localhost:${CONTENT_CDN_PORT}`;

type LinkRewriteOptions = { rewriteStaticFolder?: boolean };

export async function getConfig(
  opts?: LinkRewriteOptions
): Promise<SiteManifest> {
  const url = `${CONTENT_CDN}/config.json`;
  const response = await fetch(url).catch(() => null);
  if (!response || response.status === 404) {
    throw new Error(`No site configuration found at ${url}`);
  }
  const data = (await response.json()) as SiteManifest;
  return updateSiteManifestStaticLinksInplace(data, (url) =>
    updateLink(url, opts)
  );
}

function updateLink(
  url: string,
  {
    rewriteStaticFolder = process.env.MODE === "static",
  }: LinkRewriteOptions = {}
) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol.startsWith("http")) return url;
  } catch (error) {
    // pass
  }
  if (rewriteStaticFolder) {
    return `/myst_assets_folder${url}`;
  }
  return `${CONTENT_CDN}${url}`;
}

async function getStaticContent(
  project?: string,
  slug?: string
): Promise<PageLoader | null> {
  if (!slug) return null;
  const projectSlug = project ? `${project}/` : "";
  const url = `${CONTENT_CDN}/content/${projectSlug}${slug}.json`;
  const response = await fetch(url).catch(() => null);
  if (!response || response.status === 404) return null;
  const data = (await response.json()) as PageLoader;
  return updatePageStaticLinksInplace(data, updateLink);
}

export async function getPage(
  request: Request,
  opts: {
    project?: string;
    loadIndexPage?: boolean;
    slug?: string;
    redirect?: boolean;
  }
) {
  const projectName = opts.project;
  const config = await getConfig();
  if (!config) throw responseNoSite();
  const project = getProject(config, projectName);
  if (!project) throw responseNoArticle();
  if (opts.slug === project.index && opts.redirect) {
    throw redirect(projectName ? `/${projectName}` : "/");
  }
  if (opts.slug?.endsWith(".index") && opts.redirect) {
    const newSlug = slugToUrl(opts.slug);
    throw redirect(projectName ? `/${projectName}/${newSlug}` : `/${newSlug}`);
  }
  let slug =
    opts.loadIndexPage || opts.slug == null ? project.index : opts.slug;
  let loader = await getStaticContent(projectName, slug).catch(() => null);
  if (!loader) {
    slug = `${slug}.index`;
    loader = await getStaticContent(projectName, slug).catch(() => null);
    if (!loader) throw responseNoArticle();
  }
  const footer = getFooterLinks(config, projectName, slug);
  return {
    ...loader,
    footer,
    domain: getDomainFromRequest(request),
    project: projectName,
  };
}

/*
 * The lecture theme also exports loaders for `/objects.inv`, `/myst.xref.json`
 * and `/myst.search.json`. They are dropped here with the routes that serve
 * them: cross-reference and search wiring belongs with the Phase 2 shell (#6),
 * and `getMystSearchJson`'s type comes from `@myst-theme/search`, which is not
 * a direct dependency of this theme.
 */

export async function getFavicon(): Promise<{
  contentType: string | null;
  buffer: Buffer;
} | null> {
  // We are always fetching this at run time, so we don't want the rewritten links
  const config = await getConfig({ rewriteStaticFolder: false });
  const url = config.options?.favicon || "https://mystmd.org/favicon.ico";
  const response = await fetch(url).catch(() => null);
  if (!response || response.status === 404) return null;
  return {
    contentType: response.headers.get("Content-Type"),
    buffer: await response.buffer(),
  };
}
