"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { AuthHeader } from "@/components/auth/shared/AuthHeader";
import { onboardingSchema, type OnboardingInput } from "@/lib/schemas/auth";
import { authClient } from "@/lib/auth-client";

export function OnboardingForm() {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<OnboardingInput>({
        resolver: zodResolver(onboardingSchema),
    });

    const onSubmit = async (data: OnboardingInput) => {
        setFormError(null);
        try {
            const result = await authClient.updateUser({
                name: data.name,
            });

            if (result.error) {
                setFormError(result.error.message ?? "Failed to save your profile.");
                return;
            }

            // Mark user as onboarded via server action
            const response = await fetch("/api/auth/complete-onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: data.name }),
            });

            if (!response.ok) {
                setFormError("Failed to complete onboarding. Please try again.");
                return;
            }

            router.replace("/post-auth");
            router.refresh();
        } catch {
            setFormError("An unexpected error occurred. Please try again.");
        }
    };

    return (
        <div className="w-full">
            <AuthHeader
                title="Welcome to KL HRMS"
                subtitle="Let's set up your profile to get started"
            />

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
                    <FieldLabel htmlFor="name">Full name</FieldLabel>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Your full name"
                        autoComplete="name"
                        aria-invalid={!!errors.name}
                        {...register("name")}
                    />
                    {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Button
                    type="submit"
                    className="w-full mt-2"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Saving" : "Continue"}
                </Button>
            </form>
        </div>
    );
}
