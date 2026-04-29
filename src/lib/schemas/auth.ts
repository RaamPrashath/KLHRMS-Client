import { z } from "zod";

// Password validation rules
export const passwordRequirements = {
    minLength: 8,
    hasUppercase: /[A-Z]/,
    hasLowercase: /[a-z]/,
    hasNumber: /[0-9]/,
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

export const passwordSchema = z
    .string()
    .min(passwordRequirements.minLength, "Password must be at least 8 characters")
    .regex(passwordRequirements.hasUppercase, "Password must contain at least one uppercase letter")
    .regex(passwordRequirements.hasLowercase, "Password must contain at least one lowercase letter")
    .regex(passwordRequirements.hasNumber, "Password must contain at least one number")
    .regex(passwordRequirements.hasSpecial, "Password must contain at least one special character");

export const signupSchema = z
    .object({
        email: z.string().trim().email("Invalid email address"),
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export const loginSchema = z.object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 digits"),
});

export const onboardingSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
