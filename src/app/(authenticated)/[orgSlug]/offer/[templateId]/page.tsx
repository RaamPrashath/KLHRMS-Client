import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { OfferTemplateBuilderPage } from '@/modules/offers/components/OfferTemplateBuilderPage';

export default async function EditOfferTemplatePage({
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
    <OfferTemplateBuilderPage
      orgSlug={orgSlug}
      memberId={member.id}
      templateId={templateId}
      mode="edit"
    />
  );
}
