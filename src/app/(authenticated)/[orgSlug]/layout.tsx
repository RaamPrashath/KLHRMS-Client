import { redirect } from "next/navigation";
import organizations, { requireOrgMembership } from "@/lib/organizations";
import { OrgSidebarShell } from "@/components/sidebar/org-sidebar-shell";
import { getScope, type RolePermissions } from "@/lib/hrms-roles";
import { requireServerSession } from "@/lib/server-session";

export default async function OrganizationLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ orgSlug: string }>;
}>) {
    const session = await requireServerSession();

    const { orgSlug } = await params;
    let org: Awaited<ReturnType<typeof requireOrgMembership>>["org"];
    let member: Awaited<ReturnType<typeof requireOrgMembership>>["member"];

    try {
        ({ org, member } = await requireOrgMembership(session.user.id, orgSlug));
    } catch {
        redirect("/organizations");
    }

    const permissions = (member.role?.permissions as RolePermissions) ?? null;

    const canSwitchOrganizations =
        getScope(permissions, "permission", "edit") === "organization" ||
        getScope(permissions, "employees", "edit") === "organization";

    const organizationOptions = canSwitchOrganizations
        ? Array.from(
            new Map(
                (await organizations.getOrganizationsForUser(session.user.id))
                    .map((item) => ({
                        slug: item.slug,
                        name: item.name,
                        roleName: item.membership.role?.name ?? null,
                    }))
                    .map((item) => [item.slug, item]),
            ).values(),
        )
        : [{
            slug: org.slug,
            name: org.name,
            roleName: member.role?.name ?? null,
        }];

    const userImage = (session.user as { image?: string | null }).image ?? null;

    return (
        <OrgSidebarShell
            orgSlug={org.slug}
            orgName={org.name}
            roleName={member.role?.name ?? null}
            permissions={permissions}
            organizations={organizationOptions}
            user={{
                name: session.user.name ?? null,
                email: session.user.email ?? null,
                image: userImage,
            }}
        >
            {children}
        </OrgSidebarShell>
    );
}
