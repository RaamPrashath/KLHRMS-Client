import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login/LoginForm";
import { SignupForm } from "./signup/SignupForm";
import {
    authRequests,
    resetAuthRequests,
    type AuthSessionResponse,
    type BetterAuthErrorResponse,
    type LoginRequestBody,
    type SignupRequestBody,
    type SendVerificationOtpRequestBody,
    verifiedUser,
} from "@/test/msw/auth-handlers";
import { authServer } from "@/test/msw/server";

const nextNavigationMock = vi.hoisted(() => ({
    replace: vi.fn<(href: string) => void>(),
    searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        replace: nextNavigationMock.replace,
    }),
    useSearchParams: () => nextNavigationMock.searchParams,
}));

interface MockAuthError {
    code?: string;
    message?: string;
    status: number;
    statusText: string;
}

type MockAuthResult<TData> =
    | {
          data: TData;
          error: null;
      }
    | {
          data: null;
          error: MockAuthError;
      };

async function postAuthRequest<TBody, TData>(
    path: string,
    body: TBody,
): Promise<MockAuthResult<TData>> {
    const response = await fetch(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
        },
        body: JSON.stringify(body),
    });

    const payload = (await response.json()) as TData & Partial<BetterAuthErrorResponse>;

    if (!response.ok) {
        return {
            data: null,
            error: {
                code: payload.code,
                message: payload.message,
                status: response.status,
                statusText: response.statusText,
            },
        };
    }

    return {
        data: payload,
        error: null,
    };
}

vi.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: {
            email: (body: LoginRequestBody) =>
                postAuthRequest<LoginRequestBody, AuthSessionResponse>("/api/auth/sign-in/email", body),
            social: (body: { provider: "microsoft"; callbackURL: string }) =>
                postAuthRequest<typeof body, { url: string }>("/api/auth/sign-in/social", body),
        },
        signUp: {
            email: (body: SignupRequestBody) =>
                postAuthRequest<SignupRequestBody, AuthSessionResponse>("/api/auth/sign-up/email", body),
        },
        signOut: () => postAuthRequest<Record<string, never>, { success: boolean }>("/api/auth/sign-out", {}),
        emailOtp: {
            sendVerificationOtp: (body: SendVerificationOtpRequestBody) =>
                postAuthRequest<SendVerificationOtpRequestBody, { ok: boolean }>(
                    "/api/auth/email-otp/send-verification-otp",
                    body,
                ),
        },
    },
}));

const validEmail = "hr@kovanlabs.com";
const validPassword = "StrongP@ssword1";

function renderLoginForm(redirect = "/organizations") {
    nextNavigationMock.searchParams = new URLSearchParams([["redirect", redirect]]);
    render(<LoginForm />);
}

function renderSignupForm() {
    render(<SignupForm />);
}

async function fillLoginForm(email: string, password: string) {
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), email);
    await user.type(screen.getByLabelText(/^password$/i), password);

    return user;
}

async function fillSignupForm(email: string, password: string, confirmPassword = password) {
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), email);
    await user.type(screen.getByLabelText(/^password$/i), password);
    await user.type(screen.getByLabelText(/confirm password/i), confirmPassword);

    return user;
}

beforeEach(() => {
    nextNavigationMock.replace.mockReset();
    nextNavigationMock.searchParams = new URLSearchParams();
    resetAuthRequests();
});

describe("Login Form", () => {
    it("validates required fields, invalid email, and exposes invalid state accessibly", async () => {
        renderLoginForm();

        await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

        expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
        expect(screen.getByText("Password is required")).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("aria-invalid", "true");
        expect(authRequests.logins).toHaveLength(0);
        expect(nextNavigationMock.replace).not.toHaveBeenCalled();
    });

    it("submits credentials through the auth API, disables actions while loading, and redirects to the requested page", async () => {
        authServer.use(
            http.post("*/api/auth/sign-in/email", async ({ request }) => {
                const body = (await request.json()) as LoginRequestBody;
                authRequests.logins.push(body);
                await delay(75);

                const response: AuthSessionResponse = {
                    token: "session_token_login_success",
                    user: {
                        ...verifiedUser,
                        email: body.email,
                    },
                };

                return HttpResponse.json(response, { status: 200 });
            }),
        );
        renderLoginForm("/kovan/attendance");
        const user = await fillLoginForm(validEmail, validPassword);

        await user.click(screen.getByRole("button", { name: /^sign in$/i }));

        expect(await screen.findByRole("button", { name: /signing in/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /sign in with microsoft/i })).toBeDisabled();

        await waitFor(() => {
            expect(nextNavigationMock.replace).toHaveBeenCalledWith("/kovan/attendance");
        });
        expect(authRequests.logins).toEqual([{ email: validEmail, password: validPassword }]);
    });

    it("shows a 401 unauthorized message without redirecting", async () => {
        authServer.use(
            http.post("*/api/auth/sign-in/email", async ({ request }) => {
                const body = (await request.json()) as LoginRequestBody;
                authRequests.logins.push(body);

                const response: BetterAuthErrorResponse = {
                    code: "INVALID_CREDENTIALS",
                    message: "Invalid email or password.",
                };

                return HttpResponse.json(response, { status: 401 });
            }),
        );
        renderLoginForm();
        const user = await fillLoginForm(validEmail, "WrongP@ssword1");

        await user.click(screen.getByRole("button", { name: /^sign in$/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
        expect(nextNavigationMock.replace).not.toHaveBeenCalled();
        expect(authRequests.logins).toHaveLength(1);
    });

    it("redirects unverified email users to email verification", async () => {
        authServer.use(
            http.post("*/api/auth/sign-in/email", async ({ request }) => {
                const body = (await request.json()) as LoginRequestBody;
                authRequests.logins.push(body);

                const response: BetterAuthErrorResponse = {
                    code: "EMAIL_NOT_VERIFIED",
                    message: "Email not verified",
                };

                return HttpResponse.json(response, { status: 403 });
            }),
        );
        renderLoginForm();
        const user = await fillLoginForm("pending.user+qa@kovanlabs.com", validPassword);

        await user.click(screen.getByRole("button", { name: /^sign in$/i }));

        await waitFor(() => {
            expect(nextNavigationMock.replace).toHaveBeenCalledWith(
                "/verify-email?email=pending.user%2Bqa%40kovanlabs.com",
            );
        });
    });

    it("routes users who still need onboarding to the onboarding flow", async () => {
        authServer.use(
            http.post("*/api/auth/sign-in/email", async ({ request }) => {
                const body = (await request.json()) as LoginRequestBody;
                authRequests.logins.push(body);

                const response: AuthSessionResponse = {
                    token: "session_token_needs_onboarding",
                    user: {
                        ...verifiedUser,
                        email: body.email,
                        onboarded: false,
                    },
                };

                return HttpResponse.json(response, { status: 200 });
            }),
        );
        renderLoginForm("/kovan/attendance");
        const user = await fillLoginForm(validEmail, validPassword);

        await user.click(screen.getByRole("button", { name: /^sign in$/i }));

        await waitFor(() => {
            expect(nextNavigationMock.replace).toHaveBeenCalledWith("/onboarding");
        });
    });

    it("shows a generic retry message when the login request cannot reach the server", async () => {
        authServer.use(http.post("*/api/auth/sign-in/email", () => HttpResponse.error()));
        renderLoginForm();
        const user = await fillLoginForm(validEmail, validPassword);

        await user.click(screen.getByRole("button", { name: /^sign in$/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Something went wrong. Please try again.",
        );
        expect(nextNavigationMock.replace).not.toHaveBeenCalled();
    });
});

describe("Signup Form", () => {
    it("summarizes validation errors and marks invalid fields for assistive tech", async () => {
        renderSignupForm();
        const user = await fillSignupForm("not-an-email", "weak", "different");

        await user.click(screen.getByRole("button", { name: /create account/i }));

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("Please fix the following:");
        expect(alert).toHaveTextContent("Email: Invalid email address");
        expect(alert).toHaveTextContent("Password: Password must be at least 8 characters");
        expect(alert).toHaveTextContent("Confirm: Passwords do not match");
        expect(screen.getByLabelText(/email address/i)).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute("aria-invalid", "true");
        expect(authRequests.signups).toHaveLength(0);
    });

    it("updates password rule feedback and toggles password visibility", async () => {
        renderSignupForm();
        const user = userEvent.setup();
        const passwordInput = screen.getByLabelText(/^password$/i);

        await user.type(passwordInput, validPassword);

        expect(screen.getByText("Min. 8 characters")).toBeInTheDocument();
        expect(screen.getByText("Upper & lowercase")).toBeInTheDocument();
        expect(screen.getByText("Number")).toBeInTheDocument();
        expect(screen.getByText("Special character")).toBeInTheDocument();
        expect(passwordInput).toHaveAttribute("type", "password");

        await user.click(screen.getAllByRole("button", { name: /show password/i })[0]);

        expect(passwordInput).toHaveAttribute("type", "text");
        expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
    });

    it("creates an account, sends the verification OTP, and redirects to verification", async () => {
        renderSignupForm();
        const user = await fillSignupForm("new.member+qa@kovanlabs.com", validPassword);

        await user.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => {
            expect(nextNavigationMock.replace).toHaveBeenCalledWith(
                "/verify-email?email=new.member%2Bqa%40kovanlabs.com",
            );
        });

        const expectedSignup: SignupRequestBody = {
            email: "new.member+qa@kovanlabs.com",
            password: validPassword,
            name: "new.member+qa",
        };
        const expectedOtp: SendVerificationOtpRequestBody = {
            email: "new.member+qa@kovanlabs.com",
            type: "email-verification",
        };

        expect(authRequests.signups).toEqual([expectedSignup]);
        expect(authRequests.verificationOtps).toEqual([expectedOtp]);
    });

    it("maps a 400 duplicate-account response to a friendly signup error", async () => {
        authServer.use(
            http.post("*/api/auth/sign-up/email", async ({ request }) => {
                const body = (await request.json()) as SignupRequestBody;
                authRequests.signups.push(body);

                const response: BetterAuthErrorResponse = {
                    code: "USER_ALREADY_EXISTS",
                    message: "User already exists",
                };

                return HttpResponse.json(response, { status: 400 });
            }),
        );
        renderSignupForm();
        const user = await fillSignupForm(validEmail, validPassword);

        await user.click(screen.getByRole("button", { name: /create account/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "An account with this email already exists. Try signing in instead.",
        );
        expect(authRequests.signups).toHaveLength(1);
        expect(authRequests.verificationOtps).toHaveLength(0);
        expect(nextNavigationMock.replace).not.toHaveBeenCalled();
    });

    it("does not call signup when password confirmation fails", async () => {
        renderSignupForm();
        const user = await fillSignupForm(validEmail, validPassword, "DifferentP@ssword1");

        await user.click(screen.getByRole("button", { name: /create account/i }));

        expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
        expect(authRequests.signups).toHaveLength(0);
        expect(authRequests.verificationOtps).toHaveLength(0);
    });

    it("shows a connection error when the signup API request fails at the network layer", async () => {
        authServer.use(http.post("*/api/auth/sign-up/email", () => HttpResponse.error()));
        renderSignupForm();
        const user = await fillSignupForm(validEmail, validPassword);

        await user.click(screen.getByRole("button", { name: /create account/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Unable to connect to the server. Please check your internet connection and try again.",
        );
        expect(nextNavigationMock.replace).not.toHaveBeenCalled();
    });
});
