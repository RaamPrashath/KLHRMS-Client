"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
    const [passwordValue, setPasswordValue] = useState("");
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
        setFocus,
    } = useForm<SignupInput>({
        resolver: zodResolver(signupSchema),
    });

    // Focus first invalid field after validation error
    useEffect(() => {
        if (errors.email) {
            setFocus("email");
        } else if (errors.password) {
            setFocus("password");
        } else if (errors.confirmPassword) {
            setFocus("confirmPassword");
        }
    }, [errors, setFocus]);

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
                // Provide specific, actionable error messages
                const errorMessages: Record<string, string> = {
                    "USER_ALREADY_EXISTS": "An account with this email already exists. Try signing in instead.",
                    "WEAK_PASSWORD": "This password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.",
                    "INVALID_EMAIL": "Please enter a valid email address.",
                };
                
                setFormError(
                    errorMessages[result.error.code ?? ""] ?? 
                    result.error.message ?? 
                    "Unable to create your account. Please try again."
                );
                return;
            }

            await authClient.emailOtp.sendVerificationOtp({
                email: data.email,
                type: "email-verification",
            });

            router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } catch (error) {
            setFormError(
                "Unable to connect to the server. Please check your internet connection and try again."
            );
        }
    };

    return (
        <div className="w-full">
            <AuthHeader
                title="Create an account"
                subtitle="Get started with KL HRMS today."
            />

            <SocialButtons onError={setFormError} />

            <AuthDivider />

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4" aria-label="Sign up form">
                {/* Error Summary */}
                {(formError || Object.keys(errors).length > 0) && (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="rounded-lg border border-destructive-border bg-destructive-bg px-3 py-2.5 text-sm text-destructive-text animate-in fade-in-0 slide-in-from-top-1 duration-200"
                    >
                        {formError ? (
                            formError
                        ) : (
                            <div>
                                <p className="font-medium mb-1">Please fix the following errors:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {errors.email && <li><a href="#signup-email" className="underline hover:no-underline">Email: {errors.email.message}</a></li>}
                                    {errors.password && <li><a href="#signup-password" className="underline hover:no-underline">Password: {errors.password.message}</a></li>}
                                    {errors.confirmPassword && <li><a href="#signup-confirm-password" className="underline hover:no-underline">Confirm password: {errors.confirmPassword.message}</a></li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="signup-email">Email address</FieldLabel>
                    <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "signup-email-error" : undefined}
                        className="h-10 bg-surface border-neutral-200 rounded-md text-sm focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-colors"
                        {...register("email")}
                        ref={(e) => {
                            register("email").ref(e);
                            emailRef.current = e;
                        }}
                    />
                    {errors.email && <FieldError id="signup-email-error">{errors.email.message}</FieldError>}
                </Field>

                <Field>
                    <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                    <PasswordInput
                        id="signup-password"
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                        aria-describedby={`signup-password-rules ${errors.password ? "signup-password-error" : ""}`}
                        className="h-10 bg-surface border-neutral-200 rounded-md text-sm focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-colors"
                        showGenerator
                        value={passwordValue}
                        onChange={handlePasswordChange}
                        onGenerate={handleGeneratePassword}
                        ref={(e) => {
                            passwordRef.current = e;
                        }}
                    />
                    {errors.password && <FieldError id="signup-password-error">{errors.password.message}</FieldError>}
                    <div id="signup-password-rules">
                        <PasswordRules password={passwordValue} />
                    </div>
                </Field>

                <Field>
                    <FieldLabel htmlFor="signup-confirm-password">Confirm password</FieldLabel>
                    <PasswordInput
                        id="signup-confirm-password"
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirmPassword}
                        aria-describedby={errors.confirmPassword ? "signup-confirm-password-error" : undefined}
                        className="h-10 bg-surface border-neutral-200 rounded-md text-sm focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-colors"
                        {...register("confirmPassword")}
                        ref={(e) => {
                            register("confirmPassword").ref(e);
                            confirmPasswordRef.current = e;
                        }}
                    />
                    {errors.confirmPassword && (
                        <FieldError id="signup-confirm-password-error">{errors.confirmPassword.message}</FieldError>
                    )}
                </Field>

                <Button
                    type="submit"
                    className="w-full h-10 mt-1 bg-primary hover:bg-primary-hover active:bg-primary-press text-white text-sm font-medium rounded-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:shadow-[var(--shadow-focus)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            <span>Creating account...</span>
                        </span>
                    ) : (
                        "Create account"
                    )}
                </Button>
            </form>

            <AuthFooterLink
                text="Already have an account?"
                linkText="Sign in"
                href="/login"
            />
        </div>
    );
}
