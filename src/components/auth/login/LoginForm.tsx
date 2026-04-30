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
                const errorCode = result.error.code;
                if (errorCode === "EMAIL_NOT_VERIFIED") {
                    router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
                    return;
                }
                setFormError(result.error.message ?? "Login failed. Please try again.");
                return;
            }

            // Check onboarding status
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
                subtitle="Sign in to your account to continue"
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
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        aria-invalid={!!errors.password}
                        {...register("password")}
                    />
                    {errors.password && <FieldError>{errors.password.message}</FieldError>}
                </Field>

                <Button
                    type="submit"
                    className="w-full mt-2"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
            </form>

            <AuthFooterLink
                text="Don't have an account?"
                linkText="Sign up"
                href="/signup"
            />
        </div>
    );
}
