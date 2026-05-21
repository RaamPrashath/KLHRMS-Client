"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import NeumorphButton from "@/components/ui/neumorph-button";
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
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") ?? "/organizations";
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
                    router.replace(`/verify-email?email=${encodeURIComponent(data.email)}`);
                    return;
                }

                setFormError(
                    result.error.message || "Invalid email or password."
                );
                return;
            }

            // Session data is already in the sign-in result — no extra getSession() needed.
            const user = result.data?.user as { onboarded?: boolean } | undefined;

            if (user?.onboarded === false) {
                router.replace("/onboarding");
            } else {
                router.replace(redirectTo);
            }
        } catch {
            setFormError("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="w-full">
            <AuthHeader
                title="Welcome back"
                subtitle="Sign in to your Kovan account to continue."
            />

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
            >
                {formError && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95 duration-200">
                        {formError}
                    </div>
                )}

                <div className="space-y-3.5">
                    <Field>
                        <FieldLabel htmlFor="email">Email address</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            autoComplete="email"
                            className="h-11 rounded-xl border-border bg-secondary/50 focus:bg-white transition-all duration-200"
                            {...register("email")}
                        />
                        {errors.email && (
                            <FieldError>{errors.email.message}</FieldError>
                        )}
                    </Field>

                    <Field>
                        <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            {/* <Link
                                href="/forgot-password"
                                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                                Forgot password?
                            </Link> */}
                        </div>

                        <PasswordInput
                            id="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="h-11 rounded-xl border-border bg-secondary/50 focus:bg-white transition-all duration-200"
                            {...register("password")}
                        />

                        {errors.password && (
                            <FieldError>{errors.password.message}</FieldError>
                        )}
                    </Field>
                </div>

                <NeumorphButton
                    type="submit"
                    intent="primary"
                    className="mt-1 h-11 w-full rounded-2xl"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Signing in...
                        </span>
                    ) : (
                        "Sign in"
                    )}
                </NeumorphButton>
            </form>

            <AuthDivider className="my-3.5" />

            <SocialButtons onError={setFormError} />

            <div className="mt-6 text-center">
                <AuthFooterLink
                    text="Don't have an account yet?"
                    linkText="Create an account"
                    href="/signup"
                />
            </div>

            <div className="mt-3 text-center text-sm text-muted-foreground">
                Looking for a role?{" "}
                <Link href="/careers" className="font-medium text-primary underline-offset-4 hover:underline">
                    View careers
                </Link>
            </div>
        </div>
    );
}
