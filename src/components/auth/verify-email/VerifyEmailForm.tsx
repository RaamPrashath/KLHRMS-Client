"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { AuthHeader } from "@/components/auth/shared/AuthHeader";
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
        <div className="w-full">
            <AuthHeader
                title="Check your email"
                subtitle={
                    email
                        ? `We sent a 6-digit code to ${email}`
                        : "We sent a 6-digit verification code to your email"
                }
            />

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
                {formError && (
                    <div
                        role="alert"
                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                    >
                        {formError}
                    </div>
                )}

                {resendSuccess && (
                    <div
                        role="status"
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
                    >
                        A new code has been sent to your email.
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="otp">Verification code</FieldLabel>
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
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        )}
                    />
                    {errors.otp && <FieldError>{errors.otp.message}</FieldError>}
                </Field>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Verifying..." : "Verify email"}
                </Button>
            </form>

            <div className="mt-5 text-center">
                <p className="text-sm text-muted-foreground">
                    Didn&apos;t receive the code?{" "}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || resendLoading || !email}
                        className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {resendLoading
                            ? "Sending..."
                            : resendCooldown > 0
                              ? `Resend in ${resendCooldown}s`
                              : "Resend code"}
                    </button>
                </p>
            </div>
        </div>
    );
}
