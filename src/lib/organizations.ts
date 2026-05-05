import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

async function generateUniqueSlug(base: string) {
  const baseSlug = normalizeSlug(base) || "org";

  let candidate = baseSlug;
  let exists = await prisma.organization.findUnique({ where: { slug: candidate } });

  while (exists) {
    candidate = `${baseSlug}-${randomBytes(3).toString("hex")}`;
    exists = await prisma.organization.findUnique({ where: { slug: candidate } });
  }

  return candidate;
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function getOrganizationWithMembers(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    include: { members: { select: { id: true, organizationId: true, userId: true, createdAt: true, roleId: true, role: { select: { name: true } }, user: true } } },
  });
}

export async function getOrganizationsForUser(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
      members: {
        where: { userId },
        select: { role: { select: { name: true, permissions: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Returns ALL organizations on the platform — used for the discovery/join list.
 * Excludes orgs the user is already a member of.
 */
export async function getDiscoverableOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: {
        none: {
          userId,
        },
      },
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Adds a user to an organization as an EMPLOYEE (default join role).
 * Throws if already a member.
 */
export async function joinOrganization(userId: string, organizationId: string) {
  const existing = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { id: true },
  });
  if (existing) throw new Error("Already a member of this organization");

  return prisma.member.create({
    data: {
      organizationId,
      userId,
    },
  });
}

export async function createOrganizationForUser({
  name,
  userId,
  slug,
}: {
  name: string;
  userId: string;
  slug?: string;
}) {
  const finalSlug = slug ? normalizeSlug(slug) : await generateUniqueSlug(name);

  if (!finalSlug) {
    throw new Error("Unable to generate a valid slug");
  }

  if (slug) {
    const existing = await prisma.organization.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      throw new Error("Slug already exists");
    }
  }

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({ data: { name, slug: finalSlug } });
    await tx.member.create({
      data: {
        organizationId: created.id,
        userId,
        // creator is always the org's super admin — assign via Role relation if needed
      },
    });
    return created;
  });

  return org;
}

export async function updateOrganizationNameBySlug(slug: string, name: string) {
  return prisma.organization.update({
    where: { slug },
    data: { name },
  });
}

export async function deleteOrganizationBySlug(slug: string) {
  return prisma.organization.delete({
    where: { slug },
  });
}

export async function requireOrgMembership(userId: string, slug: string) {
  const org = await getOrganizationBySlug(slug);
  if (!org) throw new Error('Organization not found');
  const member = await prisma.member.findFirst({
    where: { organizationId: org.id, userId },
    select: { id: true, organizationId: true, userId: true, createdAt: true, roleId: true, role: { select: { name: true, permissions: true } } },
  });
  if (!member) throw new Error('Forbidden');
  return { org, member };
}

export async function requireOrgOwner(userId: string, slug: string) {
  const { org, member } = await requireOrgMembership(userId, slug);
  return { org, member };
}

const organizations = {
  normalizeSlug,
  generateUniqueSlug,
  getOrganizationBySlug,
  getOrganizationWithMembers,
  getOrganizationsForUser,
  getDiscoverableOrganizations,
  joinOrganization,
  createOrganizationForUser,
  updateOrganizationNameBySlug,
  deleteOrganizationBySlug,
  requireOrgMembership,
  requireOrgOwner,
};

export default organizations;
