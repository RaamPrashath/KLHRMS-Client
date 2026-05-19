import { redirect } from "next/navigation";
import organizations from "@/lib/organizations";
import { requireServerSession } from "@/lib/server-session";

export default async function OrganizationsCompatibilityPage() {
    const session = await requireServerSession();

    const destination = await organizations.resolvePostAuthDestination({
        userId: session.user.id,
        email: session.user.email ?? null,
    });

    redirect(destination);
}
