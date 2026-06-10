import { http, HttpResponse } from "msw";

export interface LoginRequestBody {
    email: string;
    password: string;
}

export interface SignupRequestBody {
    email: string;
    password: string;
    name: string;
}

export interface SendVerificationOtpRequestBody {
    email: string;
    type: "email-verification";
}

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    onboarded: boolean;
}

export interface AuthSessionResponse {
    token: string;
    user: AuthUser;
}

export interface BetterAuthErrorResponse {
    code: string;
    message: string;
}

export const authRequests: {
    logins: LoginRequestBody[];
    signups: SignupRequestBody[];
    verificationOtps: SendVerificationOtpRequestBody[];
} = {
    logins: [],
    signups: [],
    verificationOtps: [],
};

export function resetAuthRequests() {
    authRequests.logins = [];
    authRequests.signups = [];
    authRequests.verificationOtps = [];
}

export const verifiedUser: AuthUser = {
    id: "user_01JZ7WMVG6VBK9R3K2VY0N5Q8F",
    email: "hr@kovanlabs.com",
    name: "HR Admin",
    onboarded: true,
};

export const authHandlers = [
    http.post("*/api/auth/sign-in/email", async ({ request }) => {
        const body = (await request.json()) as LoginRequestBody;
        authRequests.logins.push(body);

        const response: AuthSessionResponse = {
            token: "session_token_01JZ7WMVM7G0EQK7SE5XFM8YFN",
            user: {
                ...verifiedUser,
                email: body.email,
            },
        };

        return HttpResponse.json(response, { status: 200 });
    }),

    http.post("*/api/auth/sign-up/email", async ({ request }) => {
        const body = (await request.json()) as SignupRequestBody;
        authRequests.signups.push(body);

        const response: AuthSessionResponse = {
            token: "session_token_01JZ7WN2Y9NHJDG0JCZEZ7QF6R",
            user: {
                id: "user_01JZ7WN2TMRJ1CX2M56W93ZQV4",
                email: body.email,
                name: body.name,
                onboarded: false,
            },
        };

        return HttpResponse.json(response, { status: 200 });
    }),

    http.post("*/api/auth/email-otp/send-verification-otp", async ({ request }) => {
        const body = (await request.json()) as SendVerificationOtpRequestBody;
        authRequests.verificationOtps.push(body);

        return HttpResponse.json({ ok: true }, { status: 200 });
    }),

    http.post("*/api/auth/sign-out", () => HttpResponse.json({ success: true }, { status: 200 })),

    http.post("*/api/auth/sign-in/social", () => HttpResponse.json({ url: "/post-auth" }, { status: 200 })),
];
