"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordInput } from "@/components/auth/shared/PasswordInput";
import { PasswordRules } from "@/components/auth/shared/PasswordRules";
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";

export function SignupForm() {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);
    const [oauthLoading, setOauthLoading] = useState(false);
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
    const emailRegistration = register("email");
    const passwordRegistration = register("password");
    const confirmPasswordRegistration = register("confirmPassword");

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
        void passwordRegistration.onChange(e);
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

            router.replace(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } catch {
            setFormError(
                "Unable to connect to the server. Please check your internet connection and try again."
            );
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
        <div className="w-full flex flex-col pt-6">
            {/* Brand Logo */}
            <div className="brand-logo-container">
                <img src="/kovan-logo.svg" alt="Kovan Labs Logo" className="login-logo" />
            </div>

            {/* Header */}
            <div className="login-header">
                <h2>Create an account</h2>
                <p>Join Kovan Labs to start managing your team.</p>
            </div>

            {/* Form Error Summaries */}
            {(formError || Object.keys(errors).length > 0) && (
                <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4 animate-in fade-in zoom-in-95 duration-200"
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
                <span>{oauthLoading ? "Connecting..." : "Continue with Microsoft"}</span>
            </button>

            {/* Divider */}
            <div className="divider">
                or sign up with email
            </div>

            {/* Credentials Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="login-form"
                aria-label="Sign up form"
            >
                {/* Email Input */}
                <div className="form-group">
                    <label className="form-label" htmlFor="signup-email">Email address</label>
                    <input
                        id="signup-email"
                        className="form-input"
                        type="email"
                        placeholder="name@company.com"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        {...emailRegistration}
                        ref={(e) => {
                            emailRegistration.ref(e);
                            emailRef.current = e;
                        }}
                    />
                    {errors.email && (
                        <span className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</span>
                    )}
                </div>

                {/* Password Input */}
                <div className="form-group">
                    <label className="form-label" htmlFor="signup-password">Password</label>
                    <PasswordInput
                        id="signup-password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                        showGenerator
                        value={passwordValue}
                        name={passwordRegistration.name}
                        onBlur={passwordRegistration.onBlur}
                        onChange={handlePasswordChange}
                        onGenerate={handleGeneratePassword}
                        ref={(e) => {
                            passwordRegistration.ref(e);
                            passwordRef.current = e;
                        }}
                    />
                    {errors.password && (
                        <span className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</span>
                    )}
                    {passwordValue.length > 0 && (
                        <div className="pt-1.5">
                            <PasswordRules password={passwordValue} />
                        </div>
                    )}
                </div>

                {/* Confirm Password Input */}
                <div className="form-group">
                    <label className="form-label" htmlFor="signup-confirm-password">Confirm password</label>
                    <PasswordInput
                        id="signup-confirm-password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirmPassword}
                        {...confirmPasswordRegistration}
                        ref={(e) => {
                            confirmPasswordRegistration.ref(e);
                            confirmPasswordRef.current = e;
                        }}
                    />
                    {errors.confirmPassword && (
                        <span className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword.message}</span>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="btn-submit mt-4"
                    id="btn-signup-submit"
                    disabled={isSubmitting || oauthLoading}
                >
                    {isSubmitting ? "Creating account..." : "Create account"}
                </button>
            </form>

            {/* Footer */}
            <div className="login-footer mt-8">
                Already have an account? <Link href="/login" id="link-signin">Sign in</Link>
            </div>

            <div className="mt-3 text-center text-xs text-muted-foreground">
                Applying for a job?{" "}
                <Link href="/careers" className="font-medium text-primary hover:underline underline-offset-4">
                    View careers
                </Link>
            </div>
        </div>
    );
}
