"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { verifyEmailSchema, type VerifyEmailInput } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";

    const [formError, setFormError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const {
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<VerifyEmailInput>({
        resolver: zodResolver(verifyEmailSchema),
        defaultValues: { otp: "" },
    });

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleResend = useCallback(async () => {
        if (!email || resendCooldown > 0) return;
        setResendLoading(true);
        setResendSuccess(false);
        setFormError(null);
        try {
            await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "email-verification",
            });
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setResendSuccess(true);
        } catch {
            setFormError("Failed to resend code. Please try again.");
        } finally {
            setResendLoading(false);
        }
    }, [email, resendCooldown]);

    const onSubmit = async (data: VerifyEmailInput) => {
        if (!email) {
            setFormError("Email address is missing. Please go back and try again.");
            return;
        }
        setFormError(null);
        try {
            const result = await authClient.emailOtp.verifyEmail({
                email,
                otp: data.otp,
            });

            if (result.error) {
                if (result.error.code === "INVALID_OTP") {
                    setFormError("Invalid code. Please check and try again.");
                } else if (result.error.code === "OTP_EXPIRED") {
                    setFormError("This code has expired. Please request a new one.");
                } else {
                    setFormError(result.error.message ?? "Verification failed.");
                }
                return;
            }

            // Auto sign in after verification
            router.push("/onboarding");
        } catch {
            setFormError("An unexpected error occurred. Please try again.");
        }
    };

    return (
        <div className="w-full flex flex-col pt-6">
            {/* Brand Logo */}
            <div className="brand-logo-container">
                <img src="/kovan-logo.svg" alt="Kovan Labs Logo" className="login-logo" />
            </div>

            {/* Header */}
            <div className="login-header">
                <h2>Check your email</h2>
                <p>
                    {email
                        ? `We sent a 6-digit code to ${email}`
                        : "We sent a 6-digit verification code to your email"}
                </p>
            </div>

            {/* Error/Status Displays */}
            {formError && (
                <div
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4 animate-in fade-in zoom-in-95 duration-200"
                >
                    {formError}
                </div>
            )}

            {resendSuccess && (
                <div
                    role="status"
                    className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4 animate-in"
                >
                    A new code has been sent to your email.
                </div>
            )}

            {/* Credentials Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="login-form"
            >
                {/* OTP input field group */}
                <div className="form-group">
                    <label className="form-label mb-2" htmlFor="otp">Verification code</label>
                    <div className="flex justify-start">
                        <Controller
                            name="otp"
                            control={control}
                            render={({ field }) => (
                                <InputOTP
                                    id="otp"
                                    maxLength={6}
                                    pattern={REGEXP_ONLY_DIGITS}
                                    value={field.value}
                                    onChange={field.onChange}
                                    aria-invalid={!!errors.otp}
                                >
                                    <InputOTPGroup className="gap-2">
                                        <InputOTPSlot index={0} className="h-12 w-12 border-border text-lg font-medium rounded-lg" />
                                        <InputOTPSlot index={1} className="h-12 w-12 border-border text-lg font-medium rounded-lg" />
                                        <InputOTPSlot index={2} className="h-12 w-12 border-border text-lg font-medium rounded-lg" />
                                        <InputOTPSlot index={3} className="h-12 w-12 border-border text-lg font-medium rounded-lg" />
                                        <InputOTPSlot index={4} className="h-12 w-12 border-border text-lg font-medium rounded-lg" />
                                        <InputOTPSlot index={5} className="h-12 w-12 border-border text-lg font-medium rounded-lg" />
                                    </InputOTPGroup>
                                </InputOTP>
                            )}
                        />
                    </div>
                    {errors.otp && (
                        <span className="text-xs text-red-500 mt-2 font-medium">{errors.otp.message}</span>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="btn-submit mt-4"
                    id="btn-verify-submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Verifying..." : "Verify email"}
                </button>
            </form>

            {/* Footer */}
            <div className="login-footer mt-8">
                Didn&apos;t receive the code?{" "}
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading || !email}
                    className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {resendLoading
                        ? "Sending..."
                        : resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : "Resend code"}
                </button>
            </div>

            <div className="mt-3 text-center text-xs text-muted-foreground">
                Wrong email address?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                    Change email
                </Link>
            </div>
        </div>
    );
}
