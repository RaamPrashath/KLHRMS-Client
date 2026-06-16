import { Suspense } from 'react';

import { DocumentCollectionSubmissionForm } from '@/modules/document-collection/components/DocumentCollectionSubmissionForm';

export default async function DocumentCollectionSubmissionPage({
  params,
}: Readonly<{
  params: Promise<{ token: string }>;
}>) {
  const { token } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
          <div className="text-sm text-neutral-500">Loading...</div>
        </div>
      }
    >
      <DocumentCollectionSubmissionForm token={token} />
    </Suspense>
  );
}
