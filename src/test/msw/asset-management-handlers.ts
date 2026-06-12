import { http, HttpResponse } from "msw";
import type {
    AssetDetail,
    AssetIssueResponse,
    AssetListResponse,
    AssetMetaResponse,
    BulkAssetCreateInput,
    EmployeeAssetViewResponse,
} from "@/modules/assets/types/assetTypes";
import type { AssetInput, HelpdeskTicketCreateInput } from "@/modules/assets/schema/assetSchemas";
import type { MyTicket } from "@/modules/assets/api/assetServerActions";
import type {
    BulkProcurementInput,
    ProcurementDecisionInput,
    ProcurementPurchaseOrderInput,
} from "@/modules/procurement/schema/procurementSchemas";
import type {
    ProcurementListResponse,
    ProcurementMetaResponse,
    ProcurementPurchaseOrderIssueResponse,
    ProcurementPurchaseOrderListResponse,
    ProcurementRequisitionRecord,
} from "@/modules/procurement/types/procurementTypes";

const nowIso = "2026-06-10T06:30:00.000Z";

export const assetManagementRequests: {
    assetQueries: URLSearchParams[];
    assetCreates: Array<{ body: unknown; orgSlug: string | null; memberId: string | null }>;
    bulkAssetCreates: BulkAssetCreateInput[];
    helpdeskCreates: HelpdeskTicketCreateInput[];
    ticketWithdrawals: string[];
    procurementCreates: BulkProcurementInput[];
    procurementSubmits: string[];
    procurementDecisions: Array<{ requisitionId: string; decision: "approve" | "reject"; body: ProcurementDecisionInput }>;
    purchaseOrders: ProcurementPurchaseOrderInput[];
} = {
    assetQueries: [],
    assetCreates: [],
    bulkAssetCreates: [],
    helpdeskCreates: [],
    ticketWithdrawals: [],
    procurementCreates: [],
    procurementSubmits: [],
    procurementDecisions: [],
    purchaseOrders: [],
};

export function resetAssetManagementRequests() {
    assetManagementRequests.assetQueries = [];
    assetManagementRequests.assetCreates = [];
    assetManagementRequests.bulkAssetCreates = [];
    assetManagementRequests.helpdeskCreates = [];
    assetManagementRequests.ticketWithdrawals = [];
    assetManagementRequests.procurementCreates = [];
    assetManagementRequests.procurementSubmits = [];
    assetManagementRequests.procurementDecisions = [];
    assetManagementRequests.purchaseOrders = [];
}

export const laptopCategory = {
    id: "category_laptop",
    name: "Laptop",
    assetCode: "AST-LAP",
    description: "Portable computers",
    isActive: true,
    fields: [
        {
            id: "field_os",
            categoryId: "category_laptop",
            fieldName: "Operating System",
            fieldType: "SELECT" as const,
            fieldOptions: { options: ["Windows", "macOS"] },
            isRequired: false,
            displayOrder: 1,
        },
    ],
};

export const mockAssetDetail: AssetDetail = {
    id: "asset_laptop_1",
    assetCode: "AST-LAP",
    name: "Dell Latitude 5450",
    category: "ELECTRONICS",
    categoryDefinitionId: laptopCategory.id,
    serialNumber: "DL-001",
    brand: "Dell",
    model: "Latitude 5450",
    purchaseDate: "2026-06-01",
    purchasePrice: 85000,
    warrantyExpiryDate: "2029-06-01",
    condition: "GOOD",
    status: "AVAILABLE",
    location: "Bengaluru HQ",
    notes: null,
    quantity: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    currentHolderMemberId: null,
    currentHolderName: null,
    currentHolderEmail: null,
    openMaintenanceCount: 0,
    unitSummary: {
        total: 1,
        available: 1,
        provided: 0,
        underMaintenance: 0,
        damaged: 0,
    },
    customFields: [],
    providedDate: null,
    providedByName: null,
    activeProvision: null,
    assetHistory: [],
    maintenanceHistory: [],
    units: [
        {
            id: "unit_laptop_1",
            assetId: "asset_laptop_1",
            serialNumber: "DL-001",
            status: "AVAILABLE",
            currentHolderMemberId: null,
            currentHolderName: null,
            condition: "GOOD",
        },
    ],
};

const assignedEmployeeAssets: EmployeeAssetViewResponse = {
    current: [
        {
            ...mockAssetDetail,
            assignmentId: "assignment_laptop_1",
            assetId: "asset_laptop_1",
            assetUnitId: "unit_laptop_1",
            status: "ASSIGNED",
            currentHolderMemberId: "member_1",
            currentHolderName: "Asha Rao",
            currentHolderEmail: "asha.rao@kovanlabs.com",
            providedDate: "2026-06-02",
            returnDate: null,
            returnedCondition: null,
            returnNotes: null,
            handoverRequestedAt: null,
            handoverCompletedAt: null,
            handoverConditionNotes: null,
            replacementAssignmentId: null,
            employeeState: "CURRENT_ASSIGNED",
            employeeStatusLabel: "Assigned",
        },
    ],
    previous: [],
};

const openAssetTicket: MyTicket = {
    id: "ticket_asset_1",
    ticketId: "AST-1001",
    ticketMode: "ASSET_ISSUE",
    assetId: "asset_laptop_1",
    assetName: "Dell Latitude 5450",
    assetCode: "AST-LAP",
    category: null,
    subject: "Laptop charger not working",
    attachmentsMetadata: [],
    maintenanceType: "REPAIR",
    issueDescription: "The charger disconnects intermittently.",
    status: "OPEN",
    serviceDate: "2026-06-10",
    createdAt: nowIso,
    updatedAt: nowIso,
};

const procurementRecord: ProcurementRequisitionRecord = {
    id: "proc_req_1",
    requestType: "BULK",
    status: "DRAFT",
    requestNumber: 1001,
    requestLabel: "PR-1001",
    raisedByMemberId: "member_hr",
    raisedByName: "HR Admin",
    approvedByMemberId: null,
    approvedByName: null,
    approvedAt: null,
    rejectedAt: null,
    reviewerComment: null,
    justification: "New engineering onboarding batch",
    requiredByDate: "2026-07-01",
    estimatedUnitCost: 85000,
    estimatedQuantity: 3,
    estimatedTotalCost: 255000,
    vendorPreference: "Dell",
    urgency: "HIGH",
    costCenterOrDepartmentId: "department_eng",
    costCenterOrDepartmentName: "Engineering",
    assetName: "Dell Latitude 5450",
    assetCode: "AST-LAP",
    categoryDefinitionId: laptopCategory.id,
    categoryName: "Laptop",
    specificationNotes: "16GB RAM, 512GB SSD",
    maintenanceTicketId: null,
    assetId: null,
    assetUnitId: null,
    affectedEmployeeId: null,
    affectedEmployeeName: null,
    originalPurchaseDate: null,
    warrantyExpiryDate: null,
    warrantyStatus: null,
    replacementReason: null,
    replacementMode: null,
    ticketSnapshot: null,
    assetSnapshot: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    currentUserCanApprove: true,
    canSubmit: true,
    approvalsPendingFinance: false,
    activities: [],
    purchaseOrders: [],
};

export const procurementPurchaseOrderInput: ProcurementPurchaseOrderInput = {
    formatKey: "STANDARD",
    template: {
        name: "Standard PO",
        pageSize: "A4",
        locale: "en-IN",
        language: "en",
        headerTitle: "Purchase Order",
        headerSubtitle: null,
        headerRichText: null,
        footerRichText: null,
        company: {
            displayName: "Kovan Labs",
            name: "Kovan Labs Pvt Ltd",
            logoUrl: null,
            address: "Bengaluru",
            contactEmail: "procurement@kovanlabs.com",
            contactPhone: null,
            taxId: null,
        },
        signatory: {
            name: "Finance Admin",
            title: "Finance",
            signatureImageUrl: null,
        },
        visibility: {
            showLogo: false,
            showVendorContact: true,
            showVendorAddress: true,
            showBillingAddress: true,
            showShippingAddress: true,
            showSubject: true,
            showPaymentTerms: true,
            showNotes: true,
            showTerms: true,
            showFooter: true,
            showSignature: true,
        },
        defaultPaymentTermsHtml: null,
        defaultNotesHtml: null,
        defaultTermsHtml: null,
    },
    document: {
        document: {
            vendor: {
                name: "Dell India",
                contactPerson: null,
                email: "sales@dell.example",
                phone: null,
                address: null,
                taxId: null,
            },
            purchaseOrderDate: "2026-06-10",
            deliveryDate: "2026-07-01",
            billingAddress: "Kovan Labs Bengaluru",
            shippingAddress: "Kovan Labs Bengaluru",
            shippingMethod: null,
            currency: "INR",
            subject: "Laptop purchase",
            paymentTermsHtml: null,
            notesHtml: null,
            termsHtml: null,
            footerNotesHtml: null,
        },
        lineItems: [
            {
                description: "Dell Latitude 5450",
                sku: "DL-5450",
                quantity: 3,
                unitPrice: 85000,
                taxPercent: 18,
                total: 300900,
            },
        ],
    },
    recipientMemberId: "member_finance",
    recipientEmail: "finance@kovanlabs.com",
    message: "Please process this approved procurement.",
    sendToAdmin: true,
};

function assetListResponse(): AssetListResponse {
    return {
        items: [mockAssetDetail],
        total: 1,
        page: 1,
        page_size: 20,
        overdue_count: 0,
    };
}

function assetMetaResponse(): AssetMetaResponse {
    return {
        members: [
            { id: "member_1", label: "Asha Rao", email: "asha.rao@kovanlabs.com" },
            { id: "member_hr", label: "HR Admin", email: "hr@kovanlabs.com" },
        ],
        categories: [laptopCategory],
        statuses: ["AVAILABLE", "ASSIGNED", "IN_MAINTENANCE", "PENDING_RETURN", "DAMAGED", "LOST", "RETIRED", "DISPOSED"],
        conditions: ["NEW", "GOOD", "FAIR", "DAMAGED", "NEEDS_REPAIR"],
        maintenanceTypes: ["REPAIR", "SERVICE", "INSPECTION", "REPLACEMENT", "UPGRADE", "WARRANTY_CLAIM", "DAMAGE_CHECK"],
        maintenanceStatuses: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        ticketModes: ["ASSET_ISSUE", "GENERAL_HELP_REQUEST"],
        reportTypes: ["ALL_ASSETS", "AVAILABLE_ASSETS", "PROVIDED_ASSETS", "RETURNED_ASSETS", "DAMAGED_ASSETS", "MAINTENANCE_HISTORY", "EMPLOYEE_ASSET_REPORT", "OFFBOARDING_PENDING_RETURN"],
    };
}

function procurementMetaResponse(): ProcurementMetaResponse {
    return {
        departments: [{ id: "department_eng", name: "Engineering" }],
        categories: [{ id: laptopCategory.id, name: laptopCategory.name, assetCode: laptopCategory.assetCode }],
        replacementTickets: [],
    };
}

function procurementListResponse(): ProcurementListResponse {
    return { items: [procurementRecord] };
}

function purchaseOrderListResponse(): ProcurementPurchaseOrderListResponse {
    return { items: [] };
}

export const assetManagementHandlers = [
    http.get("*/assets", ({ request }) => {
        const url = new URL(request.url);
        assetManagementRequests.assetQueries.push(url.searchParams);
        return HttpResponse.json(assetListResponse(), { status: 200 });
    }),

    http.get("*/assets/meta", () => HttpResponse.json(assetMetaResponse(), { status: 200 })),

    http.get("*/assets/employee-view", () => HttpResponse.json(assignedEmployeeAssets, { status: 200 })),

    http.post("*/assets", async ({ request }) => {
        const body = (await request.json()) as AssetInput;
        if (!body.assetCode || !body.name) {
            return HttpResponse.json({ detail: "Asset code and name are required" }, { status: 422 });
        }
        assetManagementRequests.assetCreates.push({
            body,
            orgSlug: request.headers.get("x-organization-slug"),
            memberId: request.headers.get("x-membership-id"),
        });
        return HttpResponse.json({ ...mockAssetDetail, ...body }, { status: 201 });
    }),

    http.post("*/assets/bulk-create", async ({ request }) => {
        const body = (await request.json()) as BulkAssetCreateInput;
        if (!body.assetCode || !body.name || !body.serialNumbers?.length) {
            return HttpResponse.json({ detail: "Asset code, name, and serial numbers are required" }, { status: 422 });
        }
        assetManagementRequests.bulkAssetCreates.push(body);
        return HttpResponse.json(
            body.serialNumbers.map((serialNumber, index) => ({
                ...mockAssetDetail,
                id: `asset_bulk_${index + 1}`,
                serialNumber,
                units: [{ ...mockAssetDetail.units[0], id: `unit_bulk_${index + 1}`, serialNumber }],
            })),
            { status: 201 },
        );
    }),

    http.get("*/assets/tickets/mine", () => HttpResponse.json([openAssetTicket], { status: 200 })),

    http.post("*/assets/helpdesk", async ({ request }) => {
        const body = (await request.json()) as HelpdeskTicketCreateInput;
        if (!body.subject || !body.issueDescription) {
            return HttpResponse.json({ detail: "Subject and description are required" }, { status: 422 });
        }
        assetManagementRequests.helpdeskCreates.push(body);
        return HttpResponse.json(
            {
                ...openAssetTicket,
                id: `ticket_${assetManagementRequests.helpdeskCreates.length}`,
                ticketId: `HD-${1000 + assetManagementRequests.helpdeskCreates.length}`,
                ticketMode: body.ticketMode,
                assetId: body.assetId ?? null,
                assetName: body.assetId ? mockAssetDetail.name : null,
                assetCode: body.assetId ? mockAssetDetail.assetCode : null,
                category: body.category ?? null,
                subject: body.subject,
                issueDescription: body.issueDescription,
                maintenanceType: body.maintenanceType,
            } satisfies MyTicket,
            { status: 201 },
        );
    }),

    http.post("*/assets/tickets/mine/:ticketId/withdraw", ({ params }) => {
        assetManagementRequests.ticketWithdrawals.push(String(params.ticketId));
        return HttpResponse.json({ ...openAssetTicket, status: "CANCELLED" }, { status: 200 });
    }),

    http.get("*/procurement/meta", () => HttpResponse.json(procurementMetaResponse(), { status: 200 })),
    http.get("*/procurement", () => HttpResponse.json(procurementListResponse(), { status: 200 })),
    http.get("*/procurement/purchase-orders", () => HttpResponse.json(purchaseOrderListResponse(), { status: 200 })),

    http.post("*/procurement", async ({ request }) => {
        const body = (await request.json()) as BulkProcurementInput;
        if (!body.assetName || !body.justification) {
            return HttpResponse.json({ detail: "Asset name and justification are required" }, { status: 422 });
        }
        assetManagementRequests.procurementCreates.push(body);
        return HttpResponse.json({ ...procurementRecord, ...body }, { status: 201 });
    }),

    http.post("*/procurement/:requisitionId/submit", ({ params }) => {
        const requisitionId = String(params.requisitionId);
        assetManagementRequests.procurementSubmits.push(requisitionId);
        return HttpResponse.json(
            { ...procurementRecord, id: requisitionId, status: "PENDING_FINANCE_APPROVAL", canSubmit: false },
            { status: 200 },
        );
    }),

    http.post("*/procurement/:requisitionId/purchase-orders", async ({ params, request }) => {
        const body = (await request.json()) as ProcurementPurchaseOrderInput;
        if (body.sendToAdmin && (!body.recipientMemberId || !body.recipientEmail)) {
            return HttpResponse.json({ detail: "Admin recipient is required" }, { status: 422 });
        }
        assetManagementRequests.purchaseOrders.push(body);
        const response: ProcurementPurchaseOrderIssueResponse = {
            requisition: { ...procurementRecord, id: String(params.requisitionId), status: "APPROVED" },
            purchaseOrderId: "po_1001",
            poNumber: "PO-1001",
            status: "SENT",
            pdf: {
                fileName: "PO-1001.pdf",
                base64: "cGRm",
                contentType: "application/pdf",
            },
        };
        return HttpResponse.json(response, { status: 201 });
    }),

    http.post("*/procurement/:requisitionId/:decision", async ({ params, request }) => {
        const decision = String(params.decision);
        if (decision !== "approve" && decision !== "reject") {
            return HttpResponse.json({ detail: "Unsupported procurement decision" }, { status: 404 });
        }
        const body = (await request.json()) as ProcurementDecisionInput;
        const requisitionId = String(params.requisitionId);
        assetManagementRequests.procurementDecisions.push({ requisitionId, decision, body });
        return HttpResponse.json(
            {
                ...procurementRecord,
                id: requisitionId,
                status: decision === "approve" ? "APPROVED" : "REJECTED",
                reviewerComment: body.comment ?? null,
            },
            { status: 200 },
        );
    }),
];
