"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { AuthHeader } from "@/components/auth/shared/AuthHeader";
import { AuthDivider } from "@/components/auth/shared/AuthDivider";
import { AuthFooterLink } from "@/components/auth/shared/AuthFooterLink";
import { SocialButtons } from "@/components/auth/shared/SocialButtons";
import { PasswordInput } from "@/components/auth/shared/PasswordInput";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                globalThis.location.reload();
            }
        };
        window.addEventListener("pageshow", handlePageShow);
        return () => {
            window.removeEventListener("pageshow", handlePageShow);
        };
    }, [router]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setFocus,
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

    // Focus first invalid field after validation error
    useEffect(() => {
        if (errors.email) {
            setFocus("email");
        } else if (errors.password) {
            setFocus("password");
        }
    }, [errors, setFocus]);

    const onSubmit = async (data: LoginInput) => {
        setFormError(null);
        try {
            const result = await authClient.signIn.email({
                email: data.email,
                password: data.password,
            });

            if (result.error) {
                if (result.error.code === "EMAIL_NOT_VERIFIED") {
                    router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
                    return;
                }
                
                // Provide specific, actionable error messages
                const errorMessages: Record<string, string> = {
                    "INVALID_CREDENTIALS": "The email or password you entered is incorrect. Please try again.",
                    "USER_NOT_FOUND": "No account found with this email. Please sign up first.",
                    "ACCOUNT_LOCKED": "Your account has been locked. Please contact support.",
                };
                
                setFormError(
                    errorMessages[result.error.code ?? ""] ?? 
                    result.error.message ?? 
                    "Unable to sign in. Please check your credentials and try again."
                );
                return;
            }

            const session = await authClient.getSession();
            if (session.data?.user) {
                const user = session.data.user as { onboarded?: boolean };
                if (user.onboarded === false) {
                    router.push("/onboarding");
                } else {
                    router.push("/organizations");
                }
            }
        } catch (error) {
            setFormError(
                "Unable to connect to the server. Please check your internet connection and try again."
            );
        }
    };

    return (
        <div className="w-full">
            <AuthHeader
                title="Welcome back"
                subtitle="Please enter your credentials to sign in."
            />

            <SocialButtons onError={setFormError} />

            <AuthDivider />

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4" aria-label="Sign in form">
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
                                    {errors.email && <li><a href="#login-email" className="underline hover:no-underline">Email: {errors.email.message}</a></li>}
                                    {errors.password && <li><a href="#login-password" className="underline hover:no-underline">Password: {errors.password.message}</a></li>}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="login-email">Email address</FieldLabel>
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "login-email-error" : undefined}
                        className="h-10 bg-surface border-neutral-200 rounded-md text-sm focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-colors"
                        {...register("email")}
                        ref={(e) => {
                            register("email").ref(e);
                            emailRef.current = e;
                        }}
                    />
                    {errors.email && <FieldError id="login-email-error">{errors.email.message}</FieldError>}
                </Field>

                <Field>
                    <div className="flex items-center justify-between mb-1.5">
                        <FieldLabel htmlFor="login-password">Password</FieldLabel>
                        <Link
                            href="/forgot-password"
                            className="text-xs text-neutral-500 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 rounded-sm"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <PasswordInput
                        id="login-password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? "login-password-error" : undefined}
                        className="h-10 bg-surface border-neutral-200 rounded-md text-sm focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-colors"
                        {...register("password")}
                        ref={(e) => {
                            register("password").ref(e);
                            passwordRef.current = e;
                        }}
                    />
                    {errors.password && <FieldError id="login-password-error">{errors.password.message}</FieldError>}
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
                            <span>Signing in...</span>
                        </span>
                    ) : (
                        "Sign in"
                    )}
                </Button>
            </form>

            <AuthFooterLink
                text="Don't have an account yet?"
                linkText="Create an account"
                href="/signup"
            />
        </div>
    );
}
