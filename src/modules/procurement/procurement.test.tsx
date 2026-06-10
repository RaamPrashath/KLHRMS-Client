import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcurementPageShell } from "@/modules/procurement/components/ProcurementPageShell";

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const routerPushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: routerPushMock }),
    useSearchParams: () => new URLSearchParams(),
}));

const useProcurementMetaQueryMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            data: { departments: [], categories: [], replacementTickets: [] },
            isLoading: false,
            isError: false,
            error: null,
        })),
);
const useProcurementListQueryMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            data: { items: [] },
            isLoading: false,
            isError: false,
            error: null,
        })),
);
const useProcurementPurchaseOrdersQueryMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            data: { items: [] },
            isLoading: false,
            isError: false,
            error: null,
        })),
);

vi.mock("@/modules/procurement/hooks/useProcurementQueries", () => ({
    useProcurementMetaQuery: useProcurementMetaQueryMock,
    useProcurementListQuery: useProcurementListQueryMock,
    useProcurementPurchaseOrdersQuery: useProcurementPurchaseOrdersQueryMock,
}));

const useProcurementMutationsMock = vi.hoisted(
    () =>
        vi.fn<(...args: unknown[]) => unknown>(() => ({
            createBulk: { mutateAsync: vi.fn(), isPending: false },
            createReplacement: { mutateAsync: vi.fn(), isPending: false },
            submit: { mutateAsync: vi.fn(), isPending: false },
            approve: { mutateAsync: vi.fn(), isPending: false },
            reject: { mutateAsync: vi.fn(), isPending: false },
            cancel: { mutateAsync: vi.fn(), isPending: false },
            issuePurchaseOrder: { mutateAsync: vi.fn(), isPending: false },
            previewPurchaseOrder: { mutateAsync: vi.fn(), isPending: false },
            savePurchaseOrderTemplate: { mutateAsync: vi.fn(), isPending: false },
            downloadPurchaseOrder: {
                mutateAsync: vi.fn(async () => ({ downloadUrl: "https://example.com/po.pdf" })),
                isPending: false,
            },
        })),
);
vi.mock("@/modules/procurement/hooks/useProcurementMutations", () => ({
    useProcurementMutations: useProcurementMutationsMock,
}));

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
    useProcurementMetaQueryMock.mockReturnValue({
        data: { departments: [], categories: [], replacementTickets: [] },
        isLoading: false,
        isError: false,
        error: null,
    });
    useProcurementListQueryMock.mockReturnValue({
        data: { items: [] },
        isLoading: false,
        isError: false,
        error: null,
    });
    useProcurementPurchaseOrdersQueryMock.mockReturnValue({
        data: { items: [] },
        isLoading: false,
        isError: false,
        error: null,
    });
});

describe("ProcurementPageShell", () => {
    it("renders the page title and description", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        expect(screen.getByText("Procurement")).toBeInTheDocument();
        expect(
            screen.getByText(/Route asset purchase requests/i),
        ).toBeInTheDocument();
    });

    it("shows bulk, replacement, mine, pending, and history tabs when user can create", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        expect(
            screen.getByRole("button", { name: /Bulk Asset Purchasing/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Replacement Purchasing/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /My Requisitions/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Pending Approval/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Approved \/ Rejected History/i }),
        ).toBeInTheDocument();
    });

    it("shows purchase orders tab only when user can approve", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={false}
                canApproveProcurement={true}
            />,
        );

        expect(
            screen.queryByRole("button", { name: /Bulk Asset Purchasing/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Generated Purchase Orders/i }),
        ).toBeInTheDocument();
    });

    it("defaults to bulk tab when user can create", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        expect(
            screen.getAllByText("Bulk Asset Purchasing").length,
        ).toBeGreaterThanOrEqual(1);
    });

    it("renders bulk procurement form fields", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        expect(
            screen.getByPlaceholderText("Dell Latitude 5450"),
        ).toBeInTheDocument();
        expect(screen.getByText("Business Justification")).toBeInTheDocument();
        expect(
            screen.getAllByText("Quantity").length,
        ).toBeGreaterThanOrEqual(1);
    });

    it("renders Save Draft and Submit to Finance buttons on bulk form", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        expect(
            screen.getByRole("button", { name: /Save Draft/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Submit to Finance/i }),
        ).toBeInTheDocument();
    });

    it("renders replacement form with ticket selector when tab clicked", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        await user.click(
            screen.getByRole("button", { name: /Replacement Purchasing/i }),
        );

        expect(
            screen.getAllByText("Replacement Purchasing").length,
        ).toBeGreaterThanOrEqual(1);
        expect(
            screen.getByText(/Link the purchasing request/i),
        ).toBeInTheDocument();
    });

    it("shows empty state in requisition table when no data", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        await user.click(
            screen.getByRole("button", { name: /My Requisitions/i }),
        );

        expect(screen.getByText("No requisitions found.")).toBeInTheDocument();
    });

    it("shows Open PO Composer button when user can approve", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={false}
                canApproveProcurement={true}
            />,
        );

        expect(
            screen.getByRole("button", { name: /Open PO Composer/i }),
        ).toBeInTheDocument();
    });

    it("Open PO Composer button is disabled when no approved requisitions exist", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={false}
                canApproveProcurement={true}
            />,
        );

        const composerBtn = screen.getByRole("button", {
            name: /Open PO Composer/i,
        });
        expect(composerBtn).toBeDisabled();
    });

    it("renders request summary sidebar on bulk tab", () => {
        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        expect(screen.getByText("Request Summary")).toBeInTheDocument();
        expect(screen.getByText("Projected Spend")).toBeInTheDocument();
    });

    it("shows loading state in requisition table when isLoading", async () => {
        useProcurementListQueryMock.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
            error: null,
        });

        const user = userEvent.setup();

        const { container } = renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={true}
                canApproveProcurement={false}
            />,
        );

        await user.click(
            screen.getByRole("button", { name: /My Requisitions/i }),
        );

        // When loading, the skeleton rows render with animate-pulse
        const skeletons = container.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders purchase order empty state when user can approve and on PO tab", async () => {
        const user = userEvent.setup();

        renderWithQueryClient(
            <ProcurementPageShell
                orgSlug="kovan"
                memberId="member_1"
                canCreateProcurement={false}
                canApproveProcurement={true}
            />,
        );

        await user.click(
            screen.getByRole("button", { name: /Generated Purchase Orders/i }),
        );

        expect(
            screen.getByText(/Generated purchase orders will appear here/i),
        ).toBeInTheDocument();
    });
});
