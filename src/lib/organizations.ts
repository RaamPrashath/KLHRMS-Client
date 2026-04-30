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
    include: { members: { include: { user: true } } },
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
        select: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
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
    await tx.member.create({ data: { organizationId: created.id, userId, role: 'OWNER' } });
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
  const member = await prisma.member.findFirst({ where: { organizationId: org.id, userId } });
  if (!member) throw new Error('Forbidden');
  return { org, member };
}

export async function requireOrgOwner(userId: string, slug: string) {
  const { org, member } = await requireOrgMembership(userId, slug);
  if (member.role !== 'OWNER') throw new Error('Owner required');
  return { org, member };
}

const organizations = {
  normalizeSlug,
  generateUniqueSlug,
  getOrganizationBySlug,
  getOrganizationWithMembers,
  getOrganizationsForUser,
  createOrganizationForUser,
  updateOrganizationNameBySlug,
  deleteOrganizationBySlug,
  requireOrgMembership,
  requireOrgOwner,
};

export default organizations;
