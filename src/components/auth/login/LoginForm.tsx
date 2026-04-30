"use client";

import { useEffect, useState } from "react";
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
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);

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
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

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
                setFormError(result.error.message ?? "Login failed. Please try again.");
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
        } catch {
            setFormError("An unexpected error occurred. Please try again.");
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

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
                {formError && (
                    <div
                        role="alert"
                        className="rounded-lg border border-destructive-border bg-destructive-bg px-3 py-2.5 text-sm text-destructive-text"
                    >
                        {formError}
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="login-email">Email</FieldLabel>
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        className="h-10 bg-surface border-neutral-200 rounded-md text-sm focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                        {...register("email")}
                    />
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>

                <Field>
                    <div className="flex items-center justify-between mb-1.5">
                        <label
                            htmlFor="login-password"
                            className="text-[13px] font-medium text-neutral-700"
                        >
                            Password
                        </label>
                        <button
                            type="button"
                            className="text-xs text-neutral-500 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 rounded-sm"
                            onClick={() => setFormError("Password reset coming soon.")}
                        >
                            Forgot password?
                        </button>
                    </div>
                    <PasswordInput
                        id="login-password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        aria-invalid={!!errors.password}
                        className="h-10 bg-surface border-neutral-200 rounded-md text-sm focus:border-primary focus:ring-[3px] focus:ring-primary/10"
                        {...register("password")}
                    />
                    {errors.password && <FieldError>{errors.password.message}</FieldError>}
                </Field>

                <Button
                    type="submit"
                    className="w-full h-10 mt-1 bg-primary hover:bg-primary-hover active:bg-primary-press text-white text-sm font-medium rounded-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:shadow-[var(--shadow-focus)]"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Signing in..." : "Sign in"}
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
