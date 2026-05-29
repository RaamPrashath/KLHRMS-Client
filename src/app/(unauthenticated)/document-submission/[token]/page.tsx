import { Suspense } from 'react';

import { DocumentSubmissionForm } from '@/modules/onboarding/components/DocumentSubmissionForm';

export default async function DocumentSubmissionPage({
  params,
}: Readonly<{
  params: Promise<{ token: string }>;
}>) {
  const { token } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
          <div className="text-sm text-neutral-500">Loading...</div>
        </div>
      }
    >
      <DocumentSubmissionForm token={token} />
    </Suspense>
  );
}
