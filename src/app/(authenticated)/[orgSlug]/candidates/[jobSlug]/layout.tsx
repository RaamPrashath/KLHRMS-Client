import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { AtsPipelineSectionLayout } from '@/modules/candidates/components/AtsPipelineSectionLayout';

export default async function CandidatesJobLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, jobSlug } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];

  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  return (
    <AtsPipelineSectionLayout orgSlug={orgSlug} memberId={member.id} jobSlug={jobSlug}>
      {children}
    </AtsPipelineSectionLayout>
  );
}
