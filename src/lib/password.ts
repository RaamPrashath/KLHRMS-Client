import { passwordRequirements } from "@/lib/schemas/auth";

export interface PasswordRule {
    id: string;
    label: string;
    test: (password: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
    {
        id: "minLength",
        label: "Min. 8 characters",
        test: (p) => p.length >= passwordRequirements.minLength,
    },
    {
        id: "upperLower",
        label: "Upper & lowercase",
        test: (p) =>
            passwordRequirements.hasUppercase.test(p) &&
            passwordRequirements.hasLowercase.test(p),
    },
    {
        id: "number",
        label: "Number",
        test: (p) => passwordRequirements.hasNumber.test(p),
    },
    {
        id: "special",
        label: "Special character",
        test: (p) => passwordRequirements.hasSpecial.test(p),
    },
];

export interface PasswordRuleState {
    id: string;
    label: string;
    passed: boolean;
}

export function checkPasswordRules(password: string): PasswordRuleState[] {
    return passwordRules.map((rule) => ({
        id: rule.id,
        label: rule.label,
        passed: rule.test(password),
    }));
}

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SPECIAL = "!@#$%^&*(),.?\":{}|<>";
const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL;

export function generateStrongPassword(length = 16): string {
    const getRandomChar = (chars: string): string =>
        chars[Math.floor(Math.random() * chars.length)];

    // Ensure at least one of each required type
    const required = [
        getRandomChar(UPPERCASE),
        getRandomChar(LOWERCASE),
        getRandomChar(NUMBERS),
        getRandomChar(SPECIAL),
    ];

    const remaining = Array.from({ length: length - required.length }, () =>
        getRandomChar(ALL_CHARS)
    );

    // Shuffle the combined array
    const combined = [...required, ...remaining];
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined.join("");
}
