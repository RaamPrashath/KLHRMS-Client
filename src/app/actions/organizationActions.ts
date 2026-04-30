'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import organizations from '@/lib/organizations';

export async function createOrganizationAction(formData: FormData) {
  const name = formData.get('name');

  if (!name || typeof name !== 'string') {
    throw new Error('Name is required');
  }

  const session = await auth.api.getSession({ headers: await headers() });
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

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');

  await organizations.requireOrgOwner(session.user.id, slug);
  await organizations.updateOrganizationNameBySlug(slug, name);

  redirect(`/${slug}/settings`);
}

export async function deleteOrganizationAction(slug: string, formData: FormData) {
  const confirmation = formData.get('confirmSlug');

  if (confirmation !== slug) {
    throw new Error('Confirmation slug does not match');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');

  await organizations.requireOrgOwner(session.user.id, slug);
  await organizations.deleteOrganizationBySlug(slug);

  redirect('/organizations');
}
