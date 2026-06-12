import { randomBytes } from "node:crypto";
import { cache } from "react";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "./prisma";
import { getScope, type RolePermissions } from "./hrms-roles";
import { ROLE_TEMPLATES } from "@/modules/roles/utils/defaultPermissions";

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function deriveDisplayNameFromEmail(email: string) {
  const localPart = normalizeEmail(email).split("@")[0] ?? "";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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

function isOrganizationAdmin(permissions: RolePermissions | null | undefined) {
  return (
    getScope(permissions, "permission", "edit") === "organization" ||
    getScope(permissions, "employees", "edit") === "organization"
  );
}

function getSeedTemplates() {
  return ROLE_TEMPLATES.filter((template) => template.name !== "Custom");
}

function isMissingOrganizationInviteTableError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  ) {
    const meta = "meta" in error ? (error as { meta?: { modelName?: string } }).meta : undefined;
    return meta?.modelName === "OrganizationInvite";
  }

  return false;
}

async function seedOrganizationRoles(
  tx: Prisma.TransactionClient,
  organizationId: string,
) {
  const roles = await Promise.all(
    getSeedTemplates().map((template) =>
      tx.role.upsert({
        where: {
          organizationId_name: {
            organizationId,
            name: template.name,
          },
        },
        update: {
          permissions: template.permissions as Prisma.InputJsonValue,
        },
        create: {
          organizationId,
          name: template.name,
          permissions: template.permissions as Prisma.InputJsonValue,
        },
      }),
    ),
  );

  const adminRole = roles.find((role) => role.name === "Admin");
  const employeeRole = roles.find((role) => role.name === "Employee");

  if (!adminRole || !employeeRole) {
    throw new Error("Default organization roles could not be seeded");
  }

  return { roles, adminRole, employeeRole };
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function getOrganizationWithMembers(slug: string) {
  try {
    return await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          select: {
            id: true,
            organizationId: true,
            userId: true,
            createdAt: true,
            roleId: true,
            role: {
              select: {
                id: true,
                name: true,
                permissions: true,
              },
            },
            user: true,
          },
          orderBy: { createdAt: "asc" },
        },
        roles: {
          select: { id: true, name: true, permissions: true },
          orderBy: { name: "asc" },
        },
        invites: {
          include: {
            role: {
              select: { id: true, name: true },
            },
            invitedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (error) {
    if (!isMissingOrganizationInviteTableError(error)) {
      throw error;
    }

    const organization = await prisma.organization.findUnique({
      where: { slug },
      include: {
        members: {
          select: {
            id: true,
            organizationId: true,
            userId: true,
            createdAt: true,
            roleId: true,
            role: {
              select: {
                id: true,
                name: true,
                permissions: true,
              },
            },
            user: true,
          },
          orderBy: { createdAt: "asc" },
        },
        roles: {
          select: { id: true, name: true, permissions: true },
          orderBy: { name: "asc" },
        },
      },
    });

    return organization ? { ...organization, invites: [] } : null;
  }
}

export async function getOrganizationsForUser(userId: string) {
  const memberships = await prisma.member.findMany({
    where: {
      userId,
      roleId: { not: null },
    },
    select: {
      id: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          permissions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    createdAt: membership.organization.createdAt,
    _count: membership.organization._count,
    membership: {
      id: membership.id,
      createdAt: membership.createdAt,
      role: membership.role,
    },
  }));
}

export async function getDefaultOrganizationPathForUser(userId: string) {
  const membership = await prisma.member.findFirst({
    where: {
      userId,
      roleId: { not: null },
    },
    select: {
      organization: { select: { slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return membership ? `/${membership.organization.slug}` : "/create-organization";
}

export async function acceptPendingOrganizationInvitesForUser(params: {
  userId: string;
  email: string;
}) {
  const email = normalizeEmail(params.email);

  try {
    await prisma.$transaction(async (tx) => {
      const invites = await tx.organizationInvite.findMany({
        where: {
          email,
          status: "PENDING",
        },
        include: {
          organization: {
            select: { id: true },
          },
          role: {
            select: { id: true },
          },
        },
      });

      for (const invite of invites) {
        const existing = await tx.member.findUnique({
          where: {
            organizationId_userId: {
              organizationId: invite.organizationId,
              userId: params.userId,
            },
          },
          select: { id: true },
        });

        if (!existing) {
          await tx.member.create({
            data: {
              organizationId: invite.organizationId,
              userId: params.userId,
              roleId: invite.roleId,
            },
          });
        }

        await tx.organizationInvite.update({
          where: { id: invite.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });
      }
    });
  } catch (error) {
    if (!isMissingOrganizationInviteTableError(error)) {
      throw error;
    }
  }
}

export async function resolvePostAuthDestination(params: {
  userId: string;
  email?: string | null;
}) {
  if (params.email) {
    const currentUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { name: true },
    });

    if (!currentUser?.name?.trim()) {
      await prisma.user.update({
        where: { id: params.userId },
        data: {
          name: deriveDisplayNameFromEmail(params.email),
        },
      });
    }
  }

  if (params.email) {
    await acceptPendingOrganizationInvitesForUser({
      userId: params.userId,
      email: params.email,
    });
  }

  return getDefaultOrganizationPathForUser(params.userId);
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
    const { adminRole } = await seedOrganizationRoles(tx, created.id);

    await tx.member.create({
      data: {
        organizationId: created.id,
        userId,
        roleId: adminRole.id,
      },
    });

    return created;
  });

  return org;
}

export async function addOrganizationMemberByEmail(params: {
  organizationId: string;
  email: string;
  roleId: string;
  invitedByUserId: string;
}) {
  const email = normalizeEmail(params.email);

  return prisma.$transaction(async (tx) => {
    const role = await tx.role.findFirst({
      where: {
        id: params.roleId,
        organizationId: params.organizationId,
      },
      select: { id: true, name: true },
    });

    if (!role) {
      throw new Error("Selected role does not belong to this organization");
    }

    const user = await tx.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const existingMembership = await tx.member.findFirst({
        where: {
          userId: user.id,
          organizationId: { not: params.organizationId },
        },
        select: { id: true, organizationId: true },
      });

      if (existingMembership) {
        throw new Error(
          "This email is already assigned to another organization. Use a different email for this invited user.",
        );
      }

      const existingMember = await tx.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: params.organizationId,
            userId: user.id,
          },
        },
        select: { id: true },
      });

      if (existingMember) {
        throw new Error("That user is already a member of this organization");
      }

      const member = await tx.member.create({
        data: {
          organizationId: params.organizationId,
          userId: user.id,
          roleId: role.id,
        },
        include: {
          role: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      });

      return { kind: "member" as const, member };
    }

    try {
      const existingInvite = await tx.organizationInvite.findFirst({
        where: {
          email,
          organizationId: { not: params.organizationId },
          status: "PENDING",
        },
        select: { id: true, organizationId: true },
      });

      if (existingInvite) {
        throw new Error(
          "This email already has a pending invite for another organization. Use a different email for this invited user.",
        );
      }

      const invite = await tx.organizationInvite.upsert({
        where: {
          organizationId_email: {
            organizationId: params.organizationId,
            email,
          },
        },
        update: {
          roleId: role.id,
          invitedByUserId: params.invitedByUserId,
          status: "PENDING",
          acceptedAt: null,
        },
        create: {
          organizationId: params.organizationId,
          email,
          roleId: role.id,
          invitedByUserId: params.invitedByUserId,
        },
        include: {
          role: { select: { id: true, name: true } },
        },
      });

      return { kind: "invite" as const, invite };
    } catch (error) {
      if (!isMissingOrganizationInviteTableError(error)) {
        throw error;
      }

      throw new Error(
        "Organization invites need the latest database migration. Run migrations before inviting new emails.",
      );
    }
  });
}

export async function addOrganizationMemberWithAccount(params: {
  organizationId: string;
  email: string;
  roleId: string;
  defaultPassword?: string;
}) {
  const { hashPassword } = await import("better-auth/crypto");
  const email = normalizeEmail(params.email);
  const password = params.defaultPassword ?? "org123";

  return prisma.$transaction(async (tx) => {
    const role = await tx.role.findFirst({
      where: { id: params.roleId, organizationId: params.organizationId },
      select: { id: true, name: true },
    });

    if (!role) {
      throw new Error("Selected role does not belong to this organization");
    }

    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await tx.member.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: { not: params.organizationId },
        },
        select: { id: true, organizationId: true },
      });

      if (existingMembership) {
        throw new Error(
          "This email is already assigned to another organization. Use a different email for this invited user.",
        );
      }

      const existingMember = await tx.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: params.organizationId,
            userId: existingUser.id,
          },
        },
        select: { id: true },
      });

      if (existingMember) {
        throw new Error("That user is already a member of this organization");
      }

      const member = await tx.member.create({
        data: {
          organizationId: params.organizationId,
          userId: existingUser.id,
          roleId: role.id,
        },
        include: {
          role: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      });

      return { kind: "member" as const, member, wasCreated: false as const };
    }

    const hashedPassword = await hashPassword(password);

    const user = await tx.user.create({
      data: {
        email,
        name: deriveDisplayNameFromEmail(email),
        emailVerified: true,
        onboarded: true,
        accounts: {
          create: {
            accountId: email,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    });

    const member = await tx.member.create({
      data: {
        organizationId: params.organizationId,
        userId: user.id,
        roleId: role.id,
      },
      include: {
        role: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return { kind: "member" as const, member, wasCreated: true as const };
  });
}

export async function updateOrganizationMemberRole(params: {
  organizationId: string;
  memberId: string;
  roleId: string;
}) {
  const role = await prisma.role.findFirst({
    where: {
      id: params.roleId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  });

  if (!role) {
    throw new Error("Selected role does not belong to this organization");
  }

  return prisma.member.update({
    where: { id: params.memberId },
    data: { roleId: role.id },
  });
}

export async function updateOrganizationNameBySlug(slug: string, name: string) {
  return prisma.organization.update({
    where: { slug },
    data: { name },
  });
}

export async function updateOrganizationSettingsBySlug(params: {
  slug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}) {
  return prisma.organization.update({
    where: { slug: params.slug },
    data: {
      name: params.name,
      latitude: params.latitude,
      longitude: params.longitude,
    },
  });
}

export async function deleteOrganizationBySlug(slug: string) {
  return prisma.organization.delete({
    where: { slug },
  });
}

export const requireOrgMembership = cache(async (userId: string, slug: string) => {
  const org = await getOrganizationBySlug(slug);
  if (!org) throw new Error("Organization not found");

  const member = await prisma.member.findFirst({
    where: { organizationId: org.id, userId },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      createdAt: true,
      roleId: true,
      role: {
        select: {
          id: true,
          name: true,
          permissions: true,
        },
      },
    },
  });

  if (!member) throw new Error("Forbidden");
  if (!member.roleId || !member.role) throw new Error("Role assignment required");

  return { org, member };
});

export async function requireOrgOwner(userId: string, slug: string) {
  const { org, member } = await requireOrgMembership(userId, slug);
  const permissions = (member.role?.permissions as RolePermissions) ?? null;

  if (!isOrganizationAdmin(permissions) && member.role?.name !== "Admin") {
    throw new Error("Forbidden");
  }

  return { org, member };
}

const organizations = {
  normalizeSlug,
  generateUniqueSlug,
  getOrganizationBySlug,
  getOrganizationWithMembers,
  getOrganizationsForUser,
  getDefaultOrganizationPathForUser,
  acceptPendingOrganizationInvitesForUser,
  resolvePostAuthDestination,
  createOrganizationForUser,
  addOrganizationMemberByEmail,
  addOrganizationMemberWithAccount,
  updateOrganizationMemberRole,
  updateOrganizationNameBySlug,
  updateOrganizationSettingsBySlug,
  deleteOrganizationBySlug,
  requireOrgMembership,
  requireOrgOwner,
};

export default organizations;
