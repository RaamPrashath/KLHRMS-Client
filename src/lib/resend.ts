const RESEND_SANDBOX_FROM_EMAIL = "Kovan Labs <onboarding@resend.dev>";

export function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || RESEND_SANDBOX_FROM_EMAIL;
}
