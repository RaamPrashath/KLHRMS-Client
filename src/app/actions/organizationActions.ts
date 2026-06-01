'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import organizations from '@/lib/organizations';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import { requireServerSession } from '@/lib/server-session';

export async function createOrganizationAction(formData: FormData) {
  const name = formData.get('name');

  if (!name || typeof name !== 'string') {
    throw new Error('Name is required');
  }

  const session = await requireServerSession();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const org = await organizations.createOrganizationForUser({
    name,
    userId: session.user.id,
  });

  redirect(`/${org.slug}`);
}

export async function updateOrganizationAction(slug: string, formData: FormData) {
  try {
    const name = formData.get('name');
    const latitudeRaw = formData.get('latitude');
    const longitudeRaw = formData.get('longitude');

    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Name is required' };
    }
    const normalizedName = name.trim();
    if (!normalizedName) {
      return { success: false, error: 'Name is required' };
    }

    const parseCoordinate = (
      value: FormDataEntryValue | null,
      label: 'Latitude' | 'Longitude',
      min: number,
      max: number,
    ) => {
      if (value == null || value === '') return null;
      if (typeof value !== 'string') {
        throw new Error(`${label} must be a valid number`);
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`${label} must be a valid number`);
      }
      if (parsed < min || parsed > max) {
        throw new Error(`${label} must be between ${min} and ${max}`);
      }
      return parsed;
    };

    const latitude = parseCoordinate(latitudeRaw, 'Latitude', -90, 90);
    const longitude = parseCoordinate(longitudeRaw, 'Longitude', -180, 180);

    const session = await requireServerSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await organizations.requireOrgOwner(session.user.id, slug);
    await organizations.updateOrganizationSettingsBySlug({
      slug,
      name: normalizedName,
      latitude,
      longitude,
    });

    revalidatePath(`/${slug}/settings`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization settings',
    };
  }
}

export async function deleteOrganizationAction(slug: string, formData: FormData) {
  const confirmation = formData.get('confirmSlug');

  if (confirmation !== slug) {
    throw new Error('Confirmation slug does not match');
  }

  const session = await requireServerSession();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await organizations.requireOrgOwner(session.user.id, slug);
  await organizations.deleteOrganizationBySlug(slug);

  const destination = await organizations.resolvePostAuthDestination({
    userId: session.user.id,
    email: session.user.email ?? null,
  });

  redirect(destination);
}

export async function addOrganizationMemberAction(slug: string, formData: FormData) {
  const email = formData.get('email');
  const roleId = formData.get('roleId');

  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }

  if (!roleId || typeof roleId !== 'string') {
    throw new Error('Role is required');
  }

  const session = await requireServerSession();
  const { org } = await organizations.requireOrgOwner(session.user.id, slug);

  await organizations.addOrganizationMemberByEmail({
    organizationId: org.id,
    email,
    roleId,
    invitedByUserId: session.user.id,
  });

  revalidatePath(`/${slug}/settings`);
}

export async function updateOrganizationMemberRoleAction(slug: string, formData: FormData) {
  const memberId = formData.get('memberId');
  const roleId = formData.get('roleId');

  if (!memberId || typeof memberId !== 'string') {
    throw new Error('Member is required');
  }

  if (!roleId || typeof roleId !== 'string') {
    throw new Error('Role is required');
  }

  const session = await requireServerSession();
  const { org } = await organizations.requireOrgOwner(session.user.id, slug);

  await organizations.updateOrganizationMemberRole({
    organizationId: org.id,
    memberId,
    roleId,
  });

  revalidatePath(`/${slug}/settings`);
}

export async function updateEmployeeRoleAction(
  slug: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const memberId = formData.get('memberId');
  const roleId = formData.get('roleId');

  if (!memberId || typeof memberId !== 'string') {
    return { success: false, error: 'Member is required' };
  }

  if (!roleId || typeof roleId !== 'string') {
    return { success: false, error: 'Role is required' };
  }

  try {
    const session = await requireServerSession();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const { org, member } = await organizations.requireOrgMembership(session.user.id, slug);
    const permissions = member.role?.permissions as RolePermissions | null;
    if (!permissions || getScope(permissions, 'permission', 'edit') === 'none') {
      return { success: false, error: 'You do not have permission to edit employee roles' };
    }

    const apiUrl = process.env.HRMS_API_URL;
    if (!apiUrl) return { success: false, error: 'HRMS_API_URL not configured' };

    const res = await fetch(`${apiUrl}/employees/${encodeURIComponent(memberId)}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-slug': slug,
        'x-membership-id': member.id,
      },
      body: JSON.stringify({ role_id: roleId }),
    });

    if (!res.ok) {
      let detail = 'Failed to update role';
      try { const b = await res.json(); detail = b.detail ?? detail; } catch {}
      return { success: false, error: detail };
    }

    revalidatePath(`/${slug}/employees`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update role';
    return { success: false, error: message };
  }
}
