"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") ?? "/organizations";
    const [formError, setFormError] = useState<string | null>(null);
    const [oauthLoading, setOauthLoading] = useState(false);

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

    const handleMicrosoftLogin = async () => {
        setOauthLoading(true);
        setFormError(null);
        try {
            await authClient.signOut();
            const result = await authClient.signIn.social({
                provider: "microsoft",
                callbackURL: "/post-auth",
            });
            if (result.error) {
                throw new Error(result.error.message ?? "Microsoft login failed");
            }
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Microsoft login failed");
        } finally {
            setOauthLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col pt-14">
            {/* Brand Logo */}
            <div className="brand-logo-container">
                <img src="/kovan-logo.svg" alt="Kovan Labs Logo" className="login-logo" />
            </div>

            {/* Login Header */}
            <div className="login-header">
                <h2>Welcome back</h2>
                <p>Please enter your details to sign in.</p>
            </div>

            {/* Form Error Display */}
            {formError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4 animate-in fade-in zoom-in-95 duration-200">
                    {formError}
                </div>
            )}

            {/* Microsoft OAuth Button */}
            <button
                type="button"
                className="btn-oauth-ms"
                id="btn-ms-login"
                onClick={handleMicrosoftLogin}
                disabled={oauthLoading || isSubmitting}
            >
                {oauthLoading ? (
                    <span className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" aria-hidden="true" />
                ) : (
                    <svg className="ms-logo" viewBox="0 0 23 23" width="16" height="16">
                        <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
                        <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
                        <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
                        <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
                    </svg>
                )}
                <span>{oauthLoading ? "Connecting..." : "Sign in with Microsoft"}</span>
            </button>

            {/* Divider */}
            <div className="divider">
                or sign in with email
            </div>

            {/* Credentials Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="login-form"
                noValidate
            >
                {/* Email Group */}
                <div className="form-group">
                    <label className="form-label" htmlFor="email">Email address</label>
                    <input
                        className="form-input"
                        type="email"
                        id="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        {...register("email")}
                    />
                    {errors.email && (
                        <span className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</span>
                    )}
                </div>

                {/* Password Group */}
                <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input
                        className="form-input"
                        type="password"
                        id="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                        {...register("password")}
                    />
                    {errors.password && (
                        <span className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</span>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="btn-submit mt-4"
                    id="btn-login-submit"
                    disabled={isSubmitting || oauthLoading}
                >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
            </form>

            {/* Footer */}
            <div className="login-footer mt-8">
                Don't have an account? <Link href="/signup" id="link-signup">Sign up</Link>
            </div>

            <div className="mt-3 text-center text-xs text-muted-foreground">
                Looking for a role?{" "}
                <Link href="/careers" className="font-medium text-primary hover:underline underline-offset-4">
                    View careers
                </Link>
            </div>
        </div>
    );
}
