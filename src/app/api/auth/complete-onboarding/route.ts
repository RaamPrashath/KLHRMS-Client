import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestSession } from "@/lib/server-session";
import { onboardingSchema } from "@/lib/schemas/auth";

export async function POST(request: Request) {
    try {
        const session = await getRequestSession(request.headers);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: unknown = await request.json();
        const parsed = onboardingSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.issues },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: parsed.data.name,
                onboarded: true,
            },
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
