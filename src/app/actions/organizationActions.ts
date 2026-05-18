'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import organizations from '@/lib/organizations';
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
  const name = formData.get('name');

  if (!name || typeof name !== 'string') {
    throw new Error('Name is required');
  }

  const session = await requireServerSession();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await organizations.requireOrgOwner(session.user.id, slug);
  await organizations.updateOrganizationNameBySlug(slug, name);

  revalidatePath(`/${slug}/settings`);
  redirect(`/${slug}/settings`);
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
