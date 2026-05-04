"use client";

import { useState } from "react";
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

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
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

                setFormError(
                    result.error.message || "Invalid email or password."
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
        } catch {
            setFormError("Something went wrong. Please try again.");
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

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
            >
                {formError && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
                        {formError}
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...register("email")}
                    />
                    {errors.email && (
                        <FieldError>{errors.email.message}</FieldError>
                    )}
                </Field>

                <Field>
                    <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="password">Password</FieldLabel>

                        <Link
                            href="/forgot-password"
                            className="text-sm text-muted-foreground hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <PasswordInput
                        id="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        {...register("password")}
                    />

                    {errors.password && (
                        <FieldError>{errors.password.message}</FieldError>
                    )}
                </Field>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Signing in...
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