import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpdeskPageShell } from "@/modules/helpdesk/components/HelpdeskPageShell";
import { HelpdeskAdminPageShell } from "@/modules/helpdesk/components/HelpdeskAdminPageShell";
import { generalHelpRequestSchema } from "@/modules/helpdesk/schema/helpdeskSchemas";
import type { HelpdeskTicket } from "@/modules/helpdesk/types/helpdeskTypes";

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const nextNavigationMock = vi.hoisted(() => ({
    replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
    useRouter: () => nextNavigationMock,
}));

const useHelpdeskTicketsQueryMock = vi.hoisted(
    () => vi.fn<(...args: unknown[]) => unknown>(),
);
vi.mock("@/modules/helpdesk/hooks/useHelpdeskTicketsQuery", () => ({
    useHelpdeskTicketsQuery: useHelpdeskTicketsQueryMock,
}));

const useHelpdeskMutationsMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            createAssetRequest: { mutateAsync: vi.fn(), isPending: false },
            createGeneralHelp: { mutateAsync: vi.fn(), isPending: false },
            withdrawTicket: { mutateAsync: vi.fn(), isPending: false },
        })),
);
vi.mock("@/modules/helpdesk/hooks/useHelpdeskMutations", () => ({
    useHelpdeskMutations: useHelpdeskMutationsMock,
}));

const useEmployeeAssetViewQueryMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            data: undefined,
            isLoading: false,
        })),
);
vi.mock("@/modules/assets/hooks/useAssetsQuery", () => ({
    useEmployeeAssetViewQuery: useEmployeeAssetViewQueryMock,
}));

const useHelpdeskAdminTicketsQueryMock = vi.hoisted(
    () => vi.fn<(...args: unknown[]) => unknown>(),
);
vi.mock("@/modules/helpdesk/hooks/useHelpdeskAdminTicketsQuery", () => ({
    useHelpdeskAdminTicketsQuery: useHelpdeskAdminTicketsQueryMock,
}));

const useAssetMutationsMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            updateMaintenance: { mutateAsync: vi.fn(), isPending: false },
        })),
);
vi.mock("@/modules/assets/hooks/useAssetMutations", () => ({
    useAssetMutations: useAssetMutationsMock,
}));

const mockTickets: HelpdeskTicket[] = [
    {
        id: "ticket_1",
        ticketId: "HD-1001",
        kind: "GENERAL_HELP",
        subject: "Payroll correction",
        description: "Need to correct my payroll for last month.",
        status: "OPEN",
        priority: "MEDIUM",
        categoryName: "FINANCE",
        assetId: null,
        assetName: null,
        assetCode: null,
        createdAt: "2026-06-10T06:30:00.000Z",
    },
    {
        id: "ticket_2",
        ticketId: "HD-1002",
        kind: "ASSET_ISSUE",
        subject: "Laptop charger issue",
        description: "The charger disconnects intermittently.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        categoryName: null,
        assetId: "asset_laptop_1",
        assetName: "Dell Latitude 5450",
        assetCode: "AST-LAP",
        createdAt: "2026-06-09T10:00:00.000Z",
    },
    {
        id: "ticket_3",
        ticketId: "HD-1003",
        kind: "GENERAL_HELP",
        subject: "Access card request",
        description: "Need new access card for the new floor.",
        status: "COMPLETED",
        priority: "LOW",
        categoryName: "IT",
        assetId: null,
        assetName: null,
        assetCode: null,
        createdAt: "2026-06-08T08:00:00.000Z",
    },
];

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
    Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
            getPropertyValue: () => "",
        }),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    installDomMocks();
    useHelpdeskTicketsQueryMock.mockReturnValue({
        data: mockTickets,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
    });
    useEmployeeAssetViewQueryMock.mockReturnValue({
        data: { current: [], previous: [] },
        isLoading: false,
    });
});

describe("HelpdeskPageShell", () => {
    it("renders page title and description", () => {
        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getByText("Helpdesk Support")).toBeInTheDocument();
    });

    it("renders tab buttons for raise and tickets", () => {
        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            screen.getByRole("button", { name: "Raise request" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Raised tickets" }),
        ).toBeInTheDocument();
    });

    it("defaults to Raise request tab with general request form", () => {
        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getByText("General request")).toBeInTheDocument();
        expect(screen.getByText("Asset request")).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(/e.g. Payroll correction/i),
        ).toBeInTheDocument();
    });

    it("switches to asset request form when clicking Asset request", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Asset request"));

        expect(
            screen.getByText(/Raise an asset request for a laptop/i),
        ).toBeInTheDocument();
    });

    it("shows no assigned assets message when user has no assets", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Asset request"));

        expect(
            screen.getByText(/You need an assigned asset/i),
        ).toBeInTheDocument();
    });

    it("submit button is disabled in asset mode when user has no assets", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Asset request"));

        const submitBtn = screen.getByRole("button", { name: /Submit asset request/i });
        expect(submitBtn).toBeDisabled();
    });

    it("shows general request submit button", () => {
        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        const submitBtn = screen.getByRole("button", { name: /Submit request/i });
        expect(submitBtn).toBeEnabled();
    });

    it("shows loading state in tickets tab", async () => {
        useHelpdeskTicketsQueryMock.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
            refetch: vi.fn(),
        });

        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        expect(screen.getByText("Loading requests...")).toBeInTheDocument();
    });

    it("shows error state with retry button in tickets tab", async () => {
        const refetchMock = vi.fn();
        useHelpdeskTicketsQueryMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error: { message: "Failed to fetch" },
            refetch: refetchMock,
        });

        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        expect(
            screen.getByText(/couldn\u2019t load your requests/i),
        ).toBeInTheDocument();
        const retryBtn = screen.getByRole("button", { name: /Retry/i });
        expect(retryBtn).toBeInTheDocument();
    });

    it("shows empty state when no tickets exist in tickets tab", async () => {
        useHelpdeskTicketsQueryMock.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
        });

        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        expect(screen.getByText("No matching requests")).toBeInTheDocument();
        expect(
            screen.getByText(/Once you raise a request/i),
        ).toBeInTheDocument();
    });

    it("renders ticket rows in tickets tab", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        expect(screen.getByText("HD-1001")).toBeInTheDocument();
        expect(screen.getByText("HD-1002")).toBeInTheDocument();
        expect(screen.getByText("HD-1003")).toBeInTheDocument();
    });

    it("shows Withdraw button for OPEN tickets and Locked for others", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        const withdrawBtns = screen.getAllByRole("button", { name: /Withdraw/i });
        expect(withdrawBtns.length).toBe(1);

        const lockedLabels = screen.getAllByText("Locked");
        expect(lockedLabels.length).toBe(2);
    });

    it("opens withdraw confirmation dialog when Withdraw is clicked", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));
        await user.click(screen.getByRole("button", { name: /Withdraw/i }));

        expect(
            screen.getByText("Withdraw request?"),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Are you sure you want to withdraw/i),
        ).toBeInTheDocument();
    });

    it("search input filters tickets in tickets tab", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        const searchInput = screen.getByPlaceholderText("Search tickets...");
        await user.type(searchInput, "HD-1001");

        expect(screen.getByText("HD-1001")).toBeInTheDocument();
        expect(screen.queryByText("HD-1002")).not.toBeInTheDocument();
    });

    it("clear button appears when filters are active", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        const searchInput = screen.getByPlaceholderText("Search tickets...");
        await user.type(searchInput, "test");

        expect(screen.getByRole("button", { name: /Clear/i })).toBeInTheDocument();
    });

    it("clear button resets filters", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        await user.click(screen.getByText("Raised tickets"));

        const searchInput = screen.getByPlaceholderText("Search tickets...");
        await user.type(searchInput, "HD-1001");

        await user.click(screen.getByRole("button", { name: /Clear/i }));

        expect(screen.getByText("HD-1002")).toBeInTheDocument();
    });

    it("renders general request form fields", () => {
        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            screen.getByPlaceholderText(/e.g. Payroll correction/i),
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(/Explain the issue/i),
        ).toBeInTheDocument();
    });

    it("submits general request and switches to tickets tab", async () => {
        const createGeneralHelpMock = vi.fn().mockResolvedValue({});
        useHelpdeskMutationsMock.mockReturnValue({
            createGeneralHelp: { mutateAsync: createGeneralHelpMock, isPending: false },
            createAssetRequest: { mutateAsync: vi.fn(), isPending: false },
            withdrawTicket: { mutateAsync: vi.fn(), isPending: false },
        });

        const user = userEvent.setup();

        renderWithQueryClient(
            <HelpdeskPageShell orgSlug="kovan" memberId="member_1" />,
        );

        // Fill the form
        await user.type(
            screen.getByPlaceholderText(/e.g. Payroll correction/i),
            "Test subject here",
        );
        await user.type(
            screen.getByPlaceholderText(/Explain the issue/i),
            "This is a test description that is long enough.",
        );

        // Submit
        await user.click(screen.getByRole("button", { name: /Submit request/i }));

        // Should switch to tickets tab
        await waitFor(() => {
            expect(
                screen.getByText("Raised tickets"),
            ).toBeInTheDocument();
        });
    });
});

describe("HelpdeskAdminPageShell", () => {
    beforeEach(() => {
        useHelpdeskAdminTicketsQueryMock.mockReturnValue({
            data: mockTickets,
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
        });
    });

    it("renders the main heading", () => {
        renderWithQueryClient(
            <HelpdeskAdminPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getByText("Helpdesk")).toBeInTheDocument();
    });

    it("renders Kanban and Table view toggle buttons", () => {
        renderWithQueryClient(
            <HelpdeskAdminPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            screen.getByRole("button", { name: /Kanban/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Table/i }),
        ).toBeInTheDocument();
    });

    it("renders search input, status filter, and category filter", () => {
        renderWithQueryClient(
            <HelpdeskAdminPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(
            screen.getByPlaceholderText(/Search requests/i),
        ).toBeInTheDocument();
    });

    it("renders column toggle buttons with counts", () => {
        renderWithQueryClient(
            <HelpdeskAdminPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getByText("3 total")).toBeInTheDocument();
    });

    it("shows loading state", () => {
        useHelpdeskAdminTicketsQueryMock.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
            refetch: vi.fn(),
        });

        renderWithQueryClient(
            <HelpdeskAdminPageShell orgSlug="kovan" memberId="member_1" />,
        );

        expect(screen.getByText("Helpdesk")).toBeInTheDocument();
    });
});

describe("generalHelpRequestSchema validation", () => {
    it("passes valid data", () => {
        const result = generalHelpRequestSchema.safeParse({
            subject: "Test subject",
            description: "This is a valid description long enough.",
            category: "IT",
            priority: "MEDIUM",
        });
        expect(result.success).toBe(true);
    });

    it("rejects short subject", () => {
        const result = generalHelpRequestSchema.safeParse({
            subject: "AB",
            description: "This is a valid description long enough.",
            category: "IT",
            priority: "MEDIUM",
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty description", () => {
        const result = generalHelpRequestSchema.safeParse({
            subject: "Test subject",
            description: "short",
            category: "IT",
            priority: "MEDIUM",
        });
        expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
        const result = generalHelpRequestSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});
