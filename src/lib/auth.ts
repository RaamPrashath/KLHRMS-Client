import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailVerification: {
        autoSignInAfterVerification: true,
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    socialProviders: {
        microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp }) {
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
                    to: email,
                    subject: "Verify your email",
                    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
                });
            },
            otpLength: 6,
            expiresIn: 600,
        }),
    ],
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // Check if this user was created via OAuth (has no password account)
                    const account = await prisma.account.findFirst({
                        where: { userId: user.id },
                    });
                    // If account exists and is not credential-based, mark as onboarded
                    if (account && account.providerId !== "credential") {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { onboarded: true },
                        });
                    }
                },
            },
        },
    },
});
