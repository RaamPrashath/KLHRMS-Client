import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CareerApplicationDialog } from "@/modules/jobs/components/CareerApplicationDialog";
import { AtsPipelineTable } from "@/modules/candidates/components/AtsPipelineTable";
import { moveApplicationStageAction } from "@/modules/candidates/api/atsServerActions";
import { AcceptedOnboardingShell } from "@/modules/onboarding/components/AcceptedOnboardingShell";
import { OnboardStageShell } from "@/modules/onboarding/components/OnboardStageShell";
import {
    acceptedOnboardingWorkspace,
    onboardWorkspace,
    recruitmentPipelineBoard,
    recruitmentRequests,
    resetRecruitmentRequests,
} from "@/test/msw/recruitment-handlers";

const supabaseUploadMock = vi.hoisted(() => vi.fn());
const supabaseGetPublicUrlMock = vi.hoisted(() => vi.fn());
const assignCredentialsAndCreateUserActionMock = vi.hoisted(() => vi.fn());

const navigationMock = vi.hoisted(() => ({
    push: vi.fn<(href: string) => void>(),
    prefetch: vi.fn<(href: string) => void>(),
    pathname: "/kovan/candidates/senior-frontend-engineer/table",
}));

vi.mock("next/navigation", () => ({
    usePathname: () => navigationMock.pathname,
    useRouter: () => ({
        push: navigationMock.push,
        prefetch: navigationMock.prefetch,
    }),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: () => ({
        storage: {
            from: () => ({
                upload: supabaseUploadMock,
                getPublicUrl: supabaseGetPublicUrlMock,
            }),
        },
    }),
}));

vi.mock("@/modules/onboarding/api/onboardingServerActions", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/modules/onboarding/api/onboardingServerActions")>();
    return {
        ...actual,
        assignCredentialsAndCreateUserAction: assignCredentialsAndCreateUserActionMock,
    };
});

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
}

function renderWithQueryClient(ui: ReactNode) {
    return render(
        <QueryClientProvider client={createQueryClient()}>
            {ui}
        </QueryClientProvider>,
    );
}

function installRadixDomMocks() {
    if (!window.PointerEvent) {
        window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
    }

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
        configurable: true,
        value: vi.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
        configurable: true,
        value: vi.fn(),
    });
}

function renderApplicationDialog(onOpenChange = vi.fn<(open: boolean) => void>()) {
    renderWithQueryClient(
        <CareerApplicationDialog
            open
            onOpenChange={onOpenChange}
            jobId="job_frontend_senior"
            organizationId="org_01"
            jobTitle="Senior Frontend Engineer"
        />,
    );
    return { onOpenChange };
}

async function fillCandidateContactDetails() {
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: /first name/i }), "Priya");
    await user.type(screen.getByRole("textbox", { name: /last name/i }), "Nair");
    await user.type(screen.getByRole("textbox", { name: /^email$/i }), "priya.nair@example.com");
    await user.type(screen.getByRole("textbox", { name: /^phone$/i }), "+91 98765 43210");
    await user.type(
        screen.getByRole("textbox", { name: /linkedin url/i }),
        "https://linkedin.com/in/priyanair",
    );

    return user;
}

beforeEach(() => {
    installRadixDomMocks();
    resetRecruitmentRequests();
    navigationMock.push.mockReset();
    navigationMock.prefetch.mockReset();
    assignCredentialsAndCreateUserActionMock.mockReset();
    supabaseUploadMock.mockReset();
    supabaseGetPublicUrlMock.mockReset();
    supabaseUploadMock.mockResolvedValue({ error: null });
    supabaseGetPublicUrlMock.mockReturnValue({
        data: { publicUrl: "https://cdn.example.com/org_01/job_frontend_senior/priya-resume.pdf" },
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon_test_key";
});

describe("Recruitment candidate application intake", () => {
    it("blocks progression when required candidate contact details and resume are invalid", async () => {
        renderApplicationDialog();

        await userEvent.click(screen.getByRole("button", { name: /submit application/i }));

        expect(await screen.findByText("First name is required")).toBeInTheDocument();
        expect(screen.getByText("Last name is required")).toBeInTheDocument();
        expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
        expect(screen.getByText("Resume is required")).toBeInTheDocument();
        expect(recruitmentRequests.publicApplications).toHaveLength(0);
        expect(supabaseUploadMock).not.toHaveBeenCalled();
    });

    it("accepts a dropped resume File, uploads it, and posts the typed candidate payload", async () => {
        const { onOpenChange } = renderApplicationDialog();
        const resume = new File(["resume-pdf"], "priya resume.pdf", { type: "application/pdf" });
        const resumeInput = screen.getByLabelText(/resume upload/i);

        fireEvent.drop(resumeInput, {
            dataTransfer: {
                files: [resume],
            },
        });

        expect(await screen.findByText("priya resume.pdf")).toBeInTheDocument();

        const user = await fillCandidateContactDetails();
        await user.click(screen.getByRole("button", { name: /submit application/i }));

        await waitFor(() => {
            expect(recruitmentRequests.publicApplications).toHaveLength(1);
        });
        expect(supabaseUploadMock).toHaveBeenCalledWith(
            expect.stringContaining("priya-resume.pdf"),
            resume,
            expect.objectContaining({ contentType: "application/pdf" }),
        );
        expect(recruitmentRequests.publicApplications[0]).toEqual({
            firstName: "Priya",
            lastName: "Nair",
            email: "priya.nair@example.com",
            phone: "+91 98765 43210",
            linkedinUrl: "https://linkedin.com/in/priyanair",
            resumeUrl: "https://cdn.example.com/org_01/job_frontend_senior/priya-resume.pdf",
            coverLetter: null,
        });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});

describe("Recruitment pipeline status updates", () => {
    it("moves a selected candidate from Applied to Interviewing through the MSW PATCH endpoint", async () => {
        const user = userEvent.setup();

        render(
            <AtsPipelineTable
                stages={recruitmentPipelineBoard.stages}
                globalSearch=""
                isMoving={false}
                onOpenCandidate={vi.fn()}
                onMoveSelected={async (applicationIds, stageId) => {
                    await Promise.all(
                        applicationIds.map((applicationId) =>
                            moveApplicationStageAction({
                                orgSlug: "kovan",
                                memberId: "member_hr",
                                applicationId,
                                data: { toStageId: stageId },
                            }),
                        ),
                    );
                }}
            />,
        );

        await user.click(screen.getByRole("checkbox", { name: /select priya nair/i }));

        const toolbar = screen.getByText("1 selected").closest("div");
        expect(toolbar).not.toBeNull();
        const targetStageSelect = within(toolbar as HTMLElement).getByRole("combobox");

        await user.click(targetStageSelect);
        await user.click(await screen.findByRole("option", { name: /interviewing/i }));
        await user.click(screen.getByRole("button", { name: /move selected/i }));

        await waitFor(() => {
            expect(recruitmentRequests.statusUpdates).toHaveLength(1);
        });
        expect(recruitmentRequests.statusUpdates[0]).toEqual({
            applicationId: "application_applied_1",
            body: { toStageId: "stage_interviewing" },
            orgSlug: "kovan",
            memberId: "member_hr",
        });
    });

    it("returns validation failures from the status endpoint without recording a successful move", async () => {
        const response = await fetch("http://localhost:8000/candidates/applications/application_applied_1/stage", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "x-organization-slug": "kovan",
                "x-membership-id": "member_hr",
            },
            body: JSON.stringify({ toStageId: "" }),
        });

        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ detail: "toStageId is required" });
        expect(recruitmentRequests.statusUpdates).toHaveLength(0);
    });
});

describe("Document collection request workflow", () => {
    it("opens a template picker and sends document collection requests for selected candidates", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <AcceptedOnboardingShell
                orgSlug="kovan"
                memberId="member_hr"
                jobSlug="senior-frontend-engineer"
                stageSlug="accepted"
                initialWorkspace={acceptedOnboardingWorkspace}
            />,
        );

        expect(screen.getByRole("heading", { name: /accepted/i })).toBeInTheDocument();
        await user.click(screen.getByRole("checkbox", { name: /select meera iyer/i }));
        await user.click(screen.getByRole("button", { name: /send document request/i }));
        expect(await screen.findByRole("dialog", { name: /send document request/i })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /^send$/i }));

        await waitFor(() => {
            expect(recruitmentRequests.documentCollectionSends).toHaveLength(1);
        });
        expect(recruitmentRequests.documentCollectionSends[0]).toEqual({
            templateId: "doc_template_standard",
            applicationIds: ["application_onboard_unsent"],
        });
    });

    it("sends credentials with the prefilled candidate email and shows sending then sent states", async () => {
        const user = userEvent.setup();
        let resolveSend: (value: { status: string }) => void = () => undefined;
        assignCredentialsAndCreateUserActionMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveSend = resolve;
            }),
        );

        renderWithQueryClient(
            <OnboardStageShell
                orgSlug="kovan"
                memberId="member_hr"
                organizationId="org_01"
                jobSlug="senior-frontend-engineer"
                stageSlug="onboarding"
                initialWorkspace={onboardWorkspace}
            />,
        );

        const row = (await screen.findByText("Dev Kapoor")).closest("tr");
        expect(row).not.toBeNull();

        await user.click(within(row as HTMLElement).getByRole("combobox"));
        await user.click(await screen.findByRole("option", { name: /hr manager/i }));

        await user.click(within(row as HTMLElement).getByRole("button", { name: /^send$/i }));

        expect(await within(row as HTMLElement).findByRole("button", { name: /sending/i })).toBeDisabled();
        expect(assignCredentialsAndCreateUserActionMock).toHaveBeenCalledWith({
            orgSlug: "kovan",
            memberId: "member_hr",
            recordId: "onboarding_dev",
            organizationId: "org_01",
            data: {
                roleId: "role_hr",
                email: "dev.kapoor@example.com",
            },
        });

        resolveSend({ status: "sent" });

        await waitFor(() => {
            expect(within(row as HTMLElement).getByText("Sent")).toBeInTheDocument();
        });
    });
});
