import { redirect } from 'next/navigation';

import { type RolePermissions, getScope } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { ResumeParserPageShell } from '@/modules/resume-parser/components/ResumeParserPageShell';

export default async function ResumeParserPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await requireServerSession();
  const { orgSlug } = await params;

  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];
  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  const permissions = (member.role?.permissions as RolePermissions) ?? null;
  if (getScope(permissions, 'candidates', 'view') === 'none') {
    redirect(`/${orgSlug}`);
  }

  return <ResumeParserPageShell orgSlug={orgSlug} memberId={member.id} />;
}

