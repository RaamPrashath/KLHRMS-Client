import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSettingsClient } from "@/modules/settings/components/AccountSettingsClient";
import { OrganizationDetailsForm } from "@/modules/settings/components/OrganizationDetailsForm";
import { UserPersonalDetailsTab } from "@/modules/settings/components/UserPersonalDetailsTab";

const routerRefreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const useMyEmployeeProfileQueryMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
        })),
);
vi.mock("@/modules/employees/hooks/useEmployeeDetailQuery", () => ({
    useMyEmployeeProfileQuery: useMyEmployeeProfileQueryMock,
}));

const mockEmployeeDetail = {
    member_id: "member_1",
    user_id: "user_1",
    name: "Asha Rao",
    given_name: "Asha",
    surname: "Rao",
    image: "/uploads/asha.png",
    profile_photo_url: null,
    contact: {
        email: "asha.rao@kovanlabs.com",
        user_principal_name: null,
        mobile_phone: null,
        business_phones: [],
        office_location: null,
    },
    address: null,
    employment: {
        employee_id: "EMP-001",
        job_title: "QA Lead",
        department: "Engineering",
        company_name: "Kovan Labs",
        employee_type: null,
        hire_date: null,
        usage_location: null,
        user_type: null,
        preferred_language: null,
    },
    role: null,
    manager: null,
    direct_reports: [],
    manager_chain: [],
    groups: [],
    sync: {
        microsoft_id: null,
        synced_at: null,
        created_date_time: null,
        account_enabled: true,
        status: "ACTIVE",
    },
    attendance_today: {
        status: "PRESENT",
        clock_in: null,
        clock_out: null,
    },
    joined_at: "2026-01-01T00:00:00.000Z",
};

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

function installDomMocks() {
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
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 32,
        width: 100,
        height: 32,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    }));
}

beforeEach(() => {
    vi.clearAllMocks();
    installDomMocks();
});

describe("OrganizationDetailsForm", () => {
    it("renders form with pre-populated values from props", () => {
        render(
            <OrganizationDetailsForm
                orgSlug="kovan"
                name="Kovan Labs"
                latitude={13.0827}
                longitude={80.2707}
            />,
        );

        const nameInput = screen.getByLabelText("Organization name");
        expect(nameInput).toHaveValue("Kovan Labs");

        const latInput = screen.getByLabelText("Office latitude");
        expect(latInput).toHaveValue(13.0827);

        const lonInput = screen.getByLabelText("Office longitude");
        expect(lonInput).toHaveValue(80.2707);
    });

    it("renders empty string placeholders for null lat/lon", () => {
        render(
            <OrganizationDetailsForm
                orgSlug="kovan"
                name="Kovan Labs"
                latitude={null}
                longitude={null}
            />,
        );

        const latInput = screen.getByLabelText("Office latitude");
        expect(latInput).toHaveValue(null);

        const lonInput = screen.getByLabelText("Office longitude");
        expect(lonInput).toHaveValue(null);
    });

    it("applies correct min/max constraints on lat/lon inputs", () => {
        render(
            <OrganizationDetailsForm
                orgSlug="kovan"
                name="Kovan Labs"
                latitude={0}
                longitude={0}
            />,
        );

        const latInput = screen.getByLabelText("Office latitude");
        expect(latInput).toHaveAttribute("min", "-90");
        expect(latInput).toHaveAttribute("max", "90");

        const lonInput = screen.getByLabelText("Office longitude");
        expect(lonInput).toHaveAttribute("min", "-180");
        expect(lonInput).toHaveAttribute("max", "180");
    });

    it("shows helper text about clearing coordinates", () => {
        render(
            <OrganizationDetailsForm
                orgSlug="kovan"
                name="Kovan Labs"
                latitude={null}
                longitude={null}
            />,
        );

        expect(
            screen.getByText(/Leave either coordinate empty/i),
        ).toBeInTheDocument();
    });

    it("renders submit button with 'Save changes' text", () => {
        render(
            <OrganizationDetailsForm
                orgSlug="kovan"
                name="Kovan Labs"
                latitude={null}
                longitude={null}
            />,
        );

        expect(
            screen.getByRole("button", { name: /Save changes/i }),
        ).toBeInTheDocument();
    });

    it("button is not disabled when not pending", () => {
        render(
            <OrganizationDetailsForm
                orgSlug="kovan"
                name="Kovan Labs"
                latitude={null}
                longitude={null}
            />,
        );

        expect(
            screen.getByRole("button", { name: /Save changes/i }),
        ).not.toBeDisabled();
    });

    it("requires name field", () => {
        render(
            <OrganizationDetailsForm
                orgSlug="kovan"
                name="Kovan Labs"
                latitude={null}
                longitude={null}
            />,
        );

        const nameInput = screen.getByLabelText("Organization name");
        expect(nameInput).toHaveAttribute("required");
    });
});

describe("UserPersonalDetailsTab", () => {
    it("shows loading skeleton when isLoading is true", () => {
        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
        });

        const { container } = renderWithQueryClient(
            <UserPersonalDetailsTab orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            container.querySelector('[data-slot="skeleton"]'),
        ).toBeInTheDocument();
    });

    it("shows error message when isError is true", () => {
        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error: { message: '{"message":"Server error"}' },
        });

        renderWithQueryClient(
            <UserPersonalDetailsTab orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    it("shows fallback error message when error has no parseable message", () => {
        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error: { message: "raw error" },
        });

        renderWithQueryClient(
            <UserPersonalDetailsTab orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            screen.getByText("Failed to load your profile."),
        ).toBeInTheDocument();
    });

    it("renders employee details when data is loaded", () => {
        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: mockEmployeeDetail,
            isLoading: false,
            isError: false,
            error: null,
        });

        renderWithQueryClient(
            <UserPersonalDetailsTab orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getAllByText("Asha Rao").length).toBeGreaterThanOrEqual(1);
        expect(
            screen.getAllByText("asha.rao@kovanlabs.com").length,
        ).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("EMP-001")).toBeInTheDocument();
        expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    });

    it("renders all four field labels", () => {
        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: mockEmployeeDetail,
            isLoading: false,
            isError: false,
            error: null,
        });

        renderWithQueryClient(
            <UserPersonalDetailsTab orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getByText("Full name")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("Employee ID")).toBeInTheDocument();
        expect(screen.getByText("Account status")).toBeInTheDocument();
    });

    it("renders email as a mailto link when email is present", () => {
        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: mockEmployeeDetail,
            isLoading: false,
            isError: false,
            error: null,
        });

        renderWithQueryClient(
            <UserPersonalDetailsTab orgSlug="kovan" memberId="member_1" />,
        );

        const mailLink = screen.getByTitle("asha.rao@kovanlabs.com");
        expect(mailLink.closest("a")).toHaveAttribute(
            "href",
            "mailto:asha.rao@kovanlabs.com",
        );
    });

    it("shows em-dash for empty values", () => {
        const detailWithEmptyFields = {
            ...mockEmployeeDetail,
            name: "",
            contact: { ...mockEmployeeDetail.contact, email: null },
            employment: { ...mockEmployeeDetail.employment, employee_id: null },
            sync: { ...mockEmployeeDetail.sync, status: "" },
        };

        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: detailWithEmptyFields,
            isLoading: false,
            isError: false,
            error: null,
        });

        renderWithQueryClient(
            <UserPersonalDetailsTab orgSlug="kovan" memberId="member_1" />,
        );

        const emDashes = screen.getAllByText("—");
        expect(emDashes.length).toBeGreaterThanOrEqual(1);
    });
});

describe("AccountSettingsClient", () => {
    it("renders tab buttons for personal details and password", () => {
        renderWithQueryClient(
            <AccountSettingsClient orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            screen.getByRole("button", { name: "Personal details" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Password" }),
        ).toBeInTheDocument();
    });

    it("defaults to personal-details tab active", () => {
        renderWithQueryClient(
            <AccountSettingsClient orgSlug="kovan" memberId="member_1" />,
        );

        const personalBtn = screen.getByRole("button", {
            name: "Personal details",
        });
        expect(personalBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("switches to password tab when clicked", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <AccountSettingsClient orgSlug="kovan" memberId="member_1" />,
        );

        const passwordBtn = screen.getByRole("button", { name: "Password" });
        await user.click(passwordBtn);

        expect(passwordBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("renders UserPersonalDetailsTab in personal-details tab", () => {
        useMyEmployeeProfileQueryMock.mockReturnValue({
            data: mockEmployeeDetail,
            isLoading: false,
            isError: false,
            error: null,
        });

        renderWithQueryClient(
            <AccountSettingsClient orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            screen.getAllByText("Asha Rao").length,
        ).toBeGreaterThanOrEqual(1);
    });
});
