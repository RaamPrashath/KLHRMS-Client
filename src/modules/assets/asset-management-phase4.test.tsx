import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    bulkCreateAssetsAction,
    createAssetAction,
} from "@/modules/assets/api/assetServerActions";
import { HelpdeskPageShell } from "@/modules/helpdesk/components/HelpdeskPageShell";
import {
    approveProcurementAction,
    createBulkProcurementAction,
    issueProcurementPurchaseOrderAction,
    submitProcurementAction,
} from "@/modules/procurement/api/procurementServerActions";
import type { AssetInput, BulkAssetCreateInput } from "@/modules/assets/schema/assetSchemas";
import type { BulkProcurementInput } from "@/modules/procurement/schema/procurementSchemas";
import {
    assetManagementRequests,
    procurementPurchaseOrderInput,
    resetAssetManagementRequests,
} from "@/test/msw/asset-management-handlers";

vi.mock("next/headers", () => ({
    headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
    auth: {
        api: {
            getSession: vi.fn(async () => ({
                user: { id: "user_hr" },
            })),
        },
    },
}));

vi.mock("@/lib/organizations", () => ({
    requireOrgMembership: vi.fn(async () => ({
        member: { id: "member_hr" },
    })),
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

const validAssetInput: AssetInput = {
    assetCode: "AST-LAP",
    name: "Dell Latitude 5450",
    category: "ELECTRONICS",
    categoryDefinitionId: "category_laptop",
    serialNumber: "DL-001",
    brand: "Dell",
    model: "Latitude 5450",
    purchaseDate: "2026-06-01",
    purchasePrice: 85000,
    warrantyExpiryDate: "2029-06-01",
    condition: "GOOD",
    status: "DAMAGED",
    location: "Bengaluru HQ",
    quantity: 1,
    customFields: [],
    units: [{ serialNumber: "DL-001" }],
};

const validBulkAssetInput: BulkAssetCreateInput = {
    assetCode: "AST-LAP",
    name: "Dell Latitude 5450",
    categoryDefinitionId: "category_laptop",
    brand: "Dell",
    condition: "GOOD",
    location: "Bengaluru HQ",
    serialNumbers: ["DL-001", "DL-002"],
    customFields: [{ fieldDefinitionId: "field_os", value: "Windows" }],
};

const validBulkProcurementInput: BulkProcurementInput = {
    requestType: "BULK",
    assetName: "Dell Latitude 5450",
    assetCode: "AST-LAP",
    categoryDefinitionId: "category_laptop",
    estimatedQuantity: 3,
    estimatedUnitCost: 85000,
    estimatedTotalCost: 255000,
    requiredByDate: "2026-07-01",
    costCenterOrDepartmentId: "department_eng",
    vendorPreference: "Dell",
    urgency: "HIGH",
    justification: "New engineering onboarding batch",
    specificationNotes: "16GB RAM, 512GB SSD",
};

beforeEach(() => {
    installRadixDomMocks();
    resetAssetManagementRequests();
});

describe("Asset inventory API integration", () => {
    it("blocks invalid asset payloads locally and posts normalized create payloads through MSW", async () => {
        await expect(
            createAssetAction({
                orgSlug: "kovan",
                memberId: "member_hr",
                data: { ...validAssetInput, assetCode: "" },
            }),
        ).rejects.toThrow("Asset code / Tag ID is required");
        expect(assetManagementRequests.assetCreates).toHaveLength(0);

        await createAssetAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            data: validAssetInput,
        });

        expect(assetManagementRequests.assetCreates).toHaveLength(1);
        expect(assetManagementRequests.assetCreates[0]).toEqual({
            orgSlug: "kovan",
            memberId: "member_hr",
            body: expect.objectContaining({
                assetCode: "AST-LAP",
                name: "Dell Latitude 5450",
                status: "AVAILABLE",
                quantity: 1,
            }),
        });
    });

    it("tracks bulk asset registration payloads including serial numbers and custom fields", async () => {
        await bulkCreateAssetsAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            data: validBulkAssetInput,
        });

        expect(assetManagementRequests.bulkAssetCreates).toEqual([validBulkAssetInput]);
    });
});

describe("Helpdesk and asset request workflows", () => {
    it("validates the general helpdesk form before submitting and records the request payload", async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<HelpdeskPageShell orgSlug="kovan" memberId="member_1" />);

        await user.click(screen.getByRole("button", { name: /^submit request$/i }));

        expect(await screen.findByText("Subject must be at least 3 characters")).toBeInTheDocument();
        expect(screen.getByText("Description must be at least 10 characters")).toBeInTheDocument();
        expect(assetManagementRequests.helpdeskCreates).toHaveLength(0);

        await user.type(screen.getByRole("textbox", { name: /^subject$/i }), "Payroll correction");
        await user.type(
            screen.getByRole("textbox", { name: /^description$/i }),
            "Please help correct my payroll reimbursement category.",
        );
        await user.click(screen.getByRole("button", { name: /^submit request$/i }));

        await waitFor(() => {
            expect(assetManagementRequests.helpdeskCreates).toHaveLength(1);
        });
        expect(assetManagementRequests.helpdeskCreates[0]).toEqual(
            expect.objectContaining({
                ticketMode: "GENERAL_HELP_REQUEST",
                category: "GENERAL",
                subject: "Payroll correction",
                issueDescription: "Please help correct my payroll reimbursement category.",
                maintenanceType: "REPAIR",
            }),
        );
    });

    it("submits an assigned-asset issue ticket with the selected asset id", async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<HelpdeskPageShell orgSlug="kovan" memberId="member_1" />);

        await user.click(screen.getByRole("button", { name: /^asset request$/i }));
        expect(await screen.findAllByText(/dell latitude 5450/i)).not.toHaveLength(0);
        await user.click(screen.getByRole("combobox", { name: /^issue type$/i }));
        await user.click(await screen.findByRole("option", { name: /^repair$/i }));
        await user.type(
            screen.getByRole("textbox", { name: /^description$/i }),
            "The laptop charger disconnects during meetings and needs replacement.",
        );
        await user.click(screen.getByRole("button", { name: /submit asset request/i }));

        await waitFor(() => {
            expect(assetManagementRequests.helpdeskCreates).toHaveLength(1);
        });
        expect(assetManagementRequests.helpdeskCreates[0]).toEqual(
            expect.objectContaining({
                ticketMode: "ASSET_ISSUE",
                assetId: "asset_laptop_1",
                subject: "Asset issue request",
                issueDescription: "The laptop charger disconnects during meetings and needs replacement.",
                maintenanceType: "REPAIR",
            }),
        );
    });

    it("withdraws an open helpdesk ticket through the ticket endpoint", async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<HelpdeskPageShell orgSlug="kovan" memberId="member_1" />);

        await user.click(screen.getByRole("button", { name: /raised tickets/i }));
        expect(await screen.findByText("AST-1001")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /^withdraw$/i }));

        const dialog = await screen.findByRole("alertdialog");
        await user.click(within(dialog).getByRole("button", { name: /^withdraw$/i }));

        await waitFor(() => {
            expect(assetManagementRequests.ticketWithdrawals).toEqual(["ticket_asset_1"]);
        });
    });
});

describe("Procurement request and purchase order network flows", () => {
    it("creates, submits, approves, and issues a purchase order with tracked MSW payloads", async () => {
        const created = await createBulkProcurementAction({
            orgSlug: "kovan",
            memberId: "ignored_by_action",
            data: validBulkProcurementInput,
        });
        await submitProcurementAction({
            orgSlug: "kovan",
            memberId: "ignored_by_action",
            requisitionId: created.id,
        });
        await approveProcurementAction({
            orgSlug: "kovan",
            memberId: "ignored_by_action",
            requisitionId: created.id,
            data: { comment: "Budget approved" },
        });
        await issueProcurementPurchaseOrderAction({
            orgSlug: "kovan",
            memberId: "ignored_by_action",
            requisitionId: created.id,
            data: procurementPurchaseOrderInput,
        });

        expect(assetManagementRequests.procurementCreates).toEqual([validBulkProcurementInput]);
        expect(assetManagementRequests.procurementSubmits).toEqual(["proc_req_1"]);
        expect(assetManagementRequests.procurementDecisions).toEqual([
            {
                requisitionId: "proc_req_1",
                decision: "approve",
                body: { comment: "Budget approved" },
            },
        ]);
        expect(assetManagementRequests.purchaseOrders).toEqual([procurementPurchaseOrderInput]);
    });

    it("blocks purchase order admin sends before network when recipient fields are missing", async () => {
        await expect(
            issueProcurementPurchaseOrderAction({
                orgSlug: "kovan",
                memberId: "member_hr",
                requisitionId: "proc_req_1",
                data: {
                    ...procurementPurchaseOrderInput,
                    recipientMemberId: null,
                    recipientEmail: null,
                    sendToAdmin: true,
                },
            }),
        ).rejects.toThrow("Admin recipient is required");

        expect(assetManagementRequests.purchaseOrders).toHaveLength(0);
    });
});
