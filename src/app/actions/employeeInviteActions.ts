'use server';

import { revalidatePath } from 'next/cache';
import organizations from '@/lib/organizations';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { requireServerSession } from '@/lib/server-session';

export async function inviteEmployeeAction(
  orgSlug: string,
  formData: FormData,
): Promise<{ success: boolean; wasCreated: boolean; error?: string }> {
  const email = formData.get('email');
  const roleId = formData.get('roleId');

  if (!email || typeof email !== 'string') {
    return { success: false, wasCreated: false, error: 'Email is required' };
  }

  if (!roleId || typeof roleId !== 'string') {
    return { success: false, wasCreated: false, error: 'Role is required' };
  }

  try {
    const session = await requireServerSession();
    if (!session?.user?.id) {
      return { success: false, wasCreated: false, error: 'Unauthorized' };
    }

    const { org, member } = await organizations.requireOrgOwner(session.user.id, orgSlug);

    const permissions = member.role?.permissions as RolePermissions | null;
    if (!permissions || getScope(permissions, 'employees', 'create') === 'none') {
      return { success: false, wasCreated: false, error: 'You do not have permission to add employees' };
    }

    const result = await organizations.addOrganizationMemberWithAccount({
      organizationId: org.id,
      email,
      roleId,
      defaultPassword: 'org123',
    });

    revalidatePath(`/${orgSlug}`);

    return { success: true, wasCreated: result.wasCreated };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add employee';
    return { success: false, wasCreated: false, error: message };
  }
}
