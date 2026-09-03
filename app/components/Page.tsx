import React from 'react';
import type { PageLoader } from '@myst-theme/common';
import { useLoaderData } from '@remix-run/react';
import type { SiteManifest } from 'myst-config';
import {
  ArticleProvider,
  GridSystemProvider,
  ProjectProvider,
  useProjectManifest,
} from '@myst-theme/providers';
import {
  BackmatterParts,
  Bibliography,
  Footnotes,
  FrontmatterParts,
  extractKnownParts,
} from '@myst-theme/site';
import { MyST } from 'myst-to-react';
import { copyNode, type GenericParent } from 'myst-common';

type ManifestProject = Required<SiteManifest>['projects'][0];

/**
 * The report page.
 *
 * Phase 0 scaffold: article content in the centred grid, and nothing else. The
 * report shell — top bar, series sidebar, footer and the QuantEcon tokens — is
 * Phase 2 (#6); the data-presentation renderers and the compliance card
 * upgrades are Phase 3 (#7, #8). What is here now exists so the build has a
 * page to render and the harness has a surface to assert against.
 *
 * `.simple-center-grid` is load-bearing beyond layout: it is the hook the
 * inlined critical CSS in `app/root.tsx` styles on first paint, and what
 * `tests/visual/fouc.spec.ts` measures.
 */
export const PageContent = React.memo(function PageContent({ article }: { article: PageLoader }) {
  const manifest = useProjectManifest();
  const tree = copyNode(article.mdast);
  const keywords = article.frontmatter?.keywords ?? [];
  const parts = extractKnownParts(tree, article.frontmatter?.parts);
  // mystmd lifts a page's leading `# Heading` into frontmatter and drops it
  // from the AST, so the title has to be rendered here or it is lost. On the
  // index page fall back to the project title, which is what the Phase 2 shell
  // will show in the report header.
  const title =
    article.frontmatter?.title ??
    (manifest?.index === article.slug ? manifest?.title : undefined);

  return (
    <GridSystemProvider gridSystem="simple-center-grid">
      <ArticleProvider
        references={{ ...article.references, article: article.mdast }}
        kind={article.kind}
        frontmatter={article.frontmatter}
      >
        <div className="relative simple-center-grid subgrid-gap">
          <div id="top" className="h-0 m-0 col-body" />
          <div id="skip-to-article" />
          {title && (
            <h1 className="pt-8 m-0">
              {article.frontmatter?.enumerator && <>{article.frontmatter.enumerator}. </>}
              {title}
            </h1>
          )}
          <FrontmatterParts
            containerClassName="col-body"
            parts={parts}
            keywords={keywords}
            hideKeywords
          />
          <MyST
            className="prose-qetext-light dark:prose-qetext-dark"
            ast={tree as GenericParent}
          />
          <BackmatterParts containerClassName="col-body" parts={parts} />
          <Footnotes innerClassName="col-body" />
          <Bibliography innerClassName="col-body" />
        </div>
      </ArticleProvider>
    </GridSystemProvider>
  );
});

export function Page() {
  const data = useLoaderData() as {
    page: PageLoader;
    project: ManifestProject;
  };
  return (
    <div className="relative bg-white dark:bg-qepage-dark">
      <ProjectProvider project={data.project}>
        <main className="px-2 pt-6">
          <PageContent article={data.page} />
        </main>
      </ProjectProvider>
    </div>
  );
}
