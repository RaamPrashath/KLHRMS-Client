import { redirect } from "next/navigation";
import organizations from "@/lib/organizations";
import { requireServerSession } from "@/lib/server-session";
import { prisma } from "@/lib/prisma";

export default async function PostAuthPage() {
    const session = await requireServerSession();

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { onboarded: true, email: true },
    });

    if (!user?.onboarded) {
        redirect("/onboarding");
    }

    const destination = await organizations.resolvePostAuthDestination({
        userId: session.user.id,
        email: user.email ?? session.user.email ?? null,
    });

    redirect(destination);
}
