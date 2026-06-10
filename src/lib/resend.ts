const RESEND_SANDBOX_FROM_EMAIL = "Kovan Labs <onboarding@resend.dev>";
const RESEND_SANDBOX_DOMAIN = "resend.dev";

function extractSenderAddress(fromEmail: string): string {
  const match = fromEmail.match(/<([^>]+)>/);
  return (match?.[1] ?? fromEmail).trim().toLowerCase();
}

function isSandboxSender(fromEmail: string): boolean {
  const address = extractSenderAddress(fromEmail);
  const domain = address.includes("@") ? address.split("@").pop() : "";
  return domain === RESEND_SANDBOX_DOMAIN;
}

export function getResendFromEmail(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || RESEND_SANDBOX_FROM_EMAIL;

  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    isSandboxSender(fromEmail)
  ) {
    throw new Error(
      "RESEND_FROM_EMAIL must use an address on a verified Resend domain in production. " +
        "onboarding@resend.dev is only for Resend sandbox testing."
    );
  }

  return fromEmail;
}
