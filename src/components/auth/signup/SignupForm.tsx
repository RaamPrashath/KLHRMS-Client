"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { AuthHeader } from "@/components/auth/shared/AuthHeader";
import { AuthDivider } from "@/components/auth/shared/AuthDivider";
import { AuthFooterLink } from "@/components/auth/shared/AuthFooterLink";
import { SocialButtons } from "@/components/auth/shared/SocialButtons";
import { PasswordInput } from "@/components/auth/shared/PasswordInput";
import { PasswordRules } from "@/components/auth/shared/PasswordRules";
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";

export function SignupForm() {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);
    // Track password value in local state for live rule checking
    const [passwordValue, setPasswordValue] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<SignupInput>({
        resolver: zodResolver(signupSchema),
    });

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPasswordValue(val);
        setValue("password", val, { shouldValidate: false });
    };

    const handleGeneratePassword = (generated: string) => {
        setPasswordValue(generated);
        setValue("password", generated, { shouldValidate: true });
    };

    const onSubmit = async (data: SignupInput) => {
        setFormError(null);
        try {
            const result = await authClient.signUp.email({
                email: data.email,
                password: data.password,
                name: data.email.split("@")[0],
            });

            if (result.error) {
                if (result.error.code === "USER_ALREADY_EXISTS") {
                    setFormError("An account with this email already exists.");
                } else {
                    setFormError(result.error.message ?? "Registration failed. Please try again.");
                }
                return;
            }

            // Send OTP for email verification
            await authClient.emailOtp.sendVerificationOtp({
                email: data.email,
                type: "email-verification",
            });

            router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } catch {
            setFormError("An unexpected error occurred. Please try again.");
        }
    };

    return (
        <div className="w-full">
            <AuthHeader
                title="Create an account"
                subtitle="Get started with KL HRMS today"
            />

            <SocialButtons onError={setFormError} />

            <AuthDivider />

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
                {formError && (
                    <div
                        role="alert"
                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                    >
                        {formError}
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                    />
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>

                <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                        id="password"
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                        showGenerator
                        value={passwordValue}
                        onChange={handlePasswordChange}
                        onGenerate={handleGeneratePassword}
                    />
                    {errors.password && <FieldError>{errors.password.message}</FieldError>}
                    <PasswordRules password={passwordValue} />
                </Field>

                <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                    <PasswordInput
                        id="confirmPassword"
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirmPassword}
                        {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                        <FieldError>{errors.confirmPassword.message}</FieldError>
                    )}
                </Field>

                <Button
                    type="submit"
                    className="w-full mt-2"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
            </form>

            <AuthFooterLink
                text="Already have an account?"
                linkText="Login"
                href="/login"
            />
        </div>
    );
}
