import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { getAuthAllowedHosts, getPublicAppUrl, getTrustedOrigins } from "@/lib/deployment-env";

const resend = new Resend(process.env.RESEND_API_KEY);
const resendFromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Kovan Labs <onboarding@resend.dev>";

export const auth = betterAuth({
    baseURL: {
        allowedHosts: getAuthAllowedHosts(),
        fallback: getPublicAppUrl(),
        protocol: process.env.NODE_ENV === "production" ? "https" : "auto",
    },
    trustedOrigins: getTrustedOrigins(),
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
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["microsoft"],
            allowDifferentEmails: true,
        },
    },
    socialProviders: {
        microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
            scope: ["User.Read"],
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            accessType: "offline",
            prompt: "consent",
        },
    },
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp }) {
                await resend.emails.send({
                    from: resendFromEmail,
                    to: email,
                    subject: "Verify your email",
                    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Figtree','Inter','Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:-0.5px;">Kovan Labs</div>
              <hr style="border:none;border-top:1px solid #e5e5e7;margin:24px 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;font-size:15px;line-height:1.6;color:#1d1d1f;font-weight:400;">
              <p style="margin:0 0 16px;">Your verification code is:</p>
              <p style="margin:0 0 20px;font-size:32px;font-weight:600;letter-spacing:8px;text-align:center;color:#1d1d1f;">${otp}</p>
              <p style="margin:0;font-size:13px;color:#86868b;">This code will expire in 10 minutes.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5f5f7;padding:24px 40px;font-size:13px;color:#86868b;text-align:center;">
              <p style="margin:0 0 4px;font-weight:600;color:#6e6e73;">Kovan Labs</p>
              <p style="margin:0;">&copy; 2026 Kovan Labs. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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
        session: {
            create: {
                after: async (session) => {
                    try {
                        const user = await prisma.user.findUnique({
                            where: { id: session.userId },
                            include: { accounts: true },
                        });
                        if (user && !user.image) {
                            const microsoftAccount = user.accounts.find(
                                (acc) => acc.providerId === "microsoft" && acc.accessToken
                            );
                            if (microsoftAccount?.accessToken) {
                                const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
                                    headers: {
                                        Authorization: `Bearer ${microsoftAccount.accessToken}`,
                                    },
                                });
                                if (response.ok) {
                                    const buffer = await response.arrayBuffer();
                                    const base64 = Buffer.from(buffer).toString("base64");
                                    await prisma.user.update({
                                        where: { id: user.id },
                                        data: { image: `data:image/jpeg;base64,${base64}` },
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch Microsoft photo in session hook", e);
                    }
                },
            },
        },
    },
});
