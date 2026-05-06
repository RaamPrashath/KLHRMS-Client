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
                subtitle="Join Kovan Labs to start managing your team."
            />

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6" aria-label="Sign up form">
                {/* Error Summary */}
                {(formError || Object.keys(errors).length > 0) && (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95 duration-200"
                    >
                        {formError ? (
                            formError
                        ) : (
                            <div>
                                <p className="font-semibold mb-1">Please fix the following:</p>
                                <ul className="list-disc list-inside space-y-0.5 opacity-90">
                                    {errors.email && <li>Email: {errors.email.message}</li>}
                                    {errors.password && <li>Password: {errors.password.message}</li>}
                                    {errors.confirmPassword && <li>Confirm: {errors.confirmPassword.message}</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-5">
                    <Field>
                        <FieldLabel htmlFor="signup-email">Email address</FieldLabel>
                        <Input
                            id="signup-email"
                            type="email"
                            placeholder="name@company.com"
                            autoComplete="email"
                            aria-invalid={!!errors.email}
                            className="h-12 rounded-xl border-border bg-secondary/50 focus:bg-white transition-all duration-200"
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
                            placeholder="••••••••"
                            autoComplete="new-password"
                            aria-invalid={!!errors.password}
                            className="h-12 rounded-xl border-border bg-secondary/50 focus:bg-white transition-all duration-200"
                            showGenerator
                            value={passwordValue}
                            onChange={handlePasswordChange}
                            onGenerate={handleGeneratePassword}
                            ref={(e) => {
                                passwordRef.current = e;
                            }}
                        />
                        {errors.password && <FieldError id="signup-password-error">{errors.password.message}</FieldError>}
                        <div className="pt-2">
                            <PasswordRules password={passwordValue} />
                        </div>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="signup-confirm-password">Confirm password</FieldLabel>
                        <PasswordInput
                            id="signup-confirm-password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            aria-invalid={!!errors.confirmPassword}
                            className="h-12 rounded-xl border-border bg-secondary/50 focus:bg-white transition-all duration-200"
                            {...register("confirmPassword")}
                        />
                        {errors.confirmPassword && (
                            <FieldError id="signup-confirm-password-error">{errors.confirmPassword.message}</FieldError>
                        )}
                    </Field>
                </div>

                <Button
                    type="submit"
                    className="btn-pill-primary h-12 w-full text-[17px] shadow-sm hover:shadow-md active:scale-[0.98] mt-2"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                            <span>Creating account...</span>
                        </span>
                    ) : (
                        "Create account"
                    )}
                </Button>
            </form>

            <AuthDivider />

            <SocialButtons onError={setFormError} />

            <div className="mt-10 text-center">
                <AuthFooterLink
                    text="Already have an account?"
                    linkText="Sign in"
                    href="/login"
                />
            </div>
        </div>
    );
}
