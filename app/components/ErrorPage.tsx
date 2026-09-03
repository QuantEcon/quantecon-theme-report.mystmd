import { ErrorDocumentNotFound, ErrorUnhandled } from '@myst-theme/site';
import { isRouteErrorResponse, useRouteError } from '@remix-run/react';

export function ErrorPage() {
  const error = useRouteError();
  return (
    <main className="article px-2 pt-6">
      {isRouteErrorResponse(error) ? (
        <ErrorDocumentNotFound />
      ) : (
        <ErrorUnhandled error={error as any} />
      )}
    </main>
  );
}
