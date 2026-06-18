import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { DocumentCollectionTemplateBuilderPage } from '@/modules/document-collection/components/DocumentCollectionTemplateBuilderPage';

export default async function EditDocumentCollectionTemplatePage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; templateId: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, templateId } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];

  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  return (
    <DocumentCollectionTemplateBuilderPage
      orgSlug={orgSlug}
      memberId={member.id}
      templateId={templateId}
      mode="edit"
    />
  );
}
