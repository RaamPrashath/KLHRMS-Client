import { http, HttpResponse } from "msw";

const nowIso = "2026-06-10T06:30:00.000Z";

export const coreModuleRequests: {
    dashboardQueries: URLSearchParams[];
    departmentCreates: unknown[];
    departmentBulkAssignments: Array<{ departmentId: string; body: unknown }>;
    employeeDeactivateIds: string[];
    projectCreates: unknown[];
    projectMemberAdds: unknown[];
    projectTaskCreates: unknown[];
    roleCreates: unknown[];
    roleDeletes: string[];
    microsoftSettingsSaves: unknown[];
    microsoftConnectionTests: unknown[];
    notificationQueries: Array<{ params: URLSearchParams; memberId: string | null }>;
    notificationReads: string[];
    onboardingSends: unknown[];
    onboardingAssigns: unknown[];
    onboardingDocumentSubmissions: unknown[];
    offerTemplateCreates: unknown[];
    offerDispatchValidations: unknown[];
    offerDispatches: unknown[];
    resumeParserUploads: Array<{ fileNames: string[]; template: FormDataEntryValue | null }>;
    resumeParserHistoryQueries: URLSearchParams[];
} = {
    dashboardQueries: [],
    departmentCreates: [],
    departmentBulkAssignments: [],
    employeeDeactivateIds: [],
    projectCreates: [],
    projectMemberAdds: [],
    projectTaskCreates: [],
    roleCreates: [],
    roleDeletes: [],
    microsoftSettingsSaves: [],
    microsoftConnectionTests: [],
    notificationQueries: [],
    notificationReads: [],
    onboardingSends: [],
    onboardingAssigns: [],
    onboardingDocumentSubmissions: [],
    offerTemplateCreates: [],
    offerDispatchValidations: [],
    offerDispatches: [],
    resumeParserUploads: [],
    resumeParserHistoryQueries: [],
};

export function resetCoreModuleRequests() {
    coreModuleRequests.dashboardQueries = [];
    coreModuleRequests.departmentCreates = [];
    coreModuleRequests.departmentBulkAssignments = [];
    coreModuleRequests.employeeDeactivateIds = [];
    coreModuleRequests.projectCreates = [];
    coreModuleRequests.projectMemberAdds = [];
    coreModuleRequests.projectTaskCreates = [];
    coreModuleRequests.roleCreates = [];
    coreModuleRequests.roleDeletes = [];
    coreModuleRequests.microsoftSettingsSaves = [];
    coreModuleRequests.microsoftConnectionTests = [];
    coreModuleRequests.notificationQueries = [];
    coreModuleRequests.notificationReads = [];
    coreModuleRequests.onboardingSends = [];
    coreModuleRequests.onboardingAssigns = [];
    coreModuleRequests.onboardingDocumentSubmissions = [];
    coreModuleRequests.offerTemplateCreates = [];
    coreModuleRequests.offerDispatchValidations = [];
    coreModuleRequests.offerDispatches = [];
    coreModuleRequests.resumeParserUploads = [];
    coreModuleRequests.resumeParserHistoryQueries = [];
}

const memberAsha = {
    id: "member_1",
    userId: "user_1",
    name: "Asha Rao",
    email: "asha.rao@kovanlabs.com",
};

const departmentEngineering = {
    id: "department_eng",
    organizationId: "org_01",
    name: "Engineering",
    status: "ACTIVE",
    headMemberId: "member_1",
    headName: "Asha Rao",
    parentDepartmentId: null,
    parentDepartmentName: null,
    memberCount: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    members: [memberAsha],
    heads: [memberAsha],
    childDepartments: [],
};

const employeeAsha = {
    id: "member_1",
    memberId: "member_1",
    userId: "user_1",
    name: "Asha Rao",
    email: "asha.rao@kovanlabs.com",
    image: "/uploads/asha.png",
    roleId: "role_hr",
    roleName: "HR Manager",
    departmentId: "department_eng",
    departmentName: "Engineering",
    status: "ACTIVE",
    designation: "QA Lead",
    createdAt: nowIso,
    updatedAt: nowIso,
};

const projectPayroll = {
    id: "project_payroll",
    organizationId: "org_01",
    name: "Payroll Revamp",
    clientName: "Kovan Labs",
    budget: 250000,
    budgetedHours: 320,
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    status: "ACTIVE",
    billable: true,
    description: "Payroll modernization",
    memberCount: 1,
    taskCount: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    members: [],
    tasks: [{ id: "task_calendar_qa", name: "Calendar QA" }],
};

const roleHr = {
    id: "role_hr",
    name: "HR Manager",
    description: null,
    permissions: {
        employees: { view: "organization", create: "organization" },
        departments: { view: "organization" },
    },
    members: [],
    createdAt: nowIso,
    updatedAt: nowIso,
};

const notificationRecord = {
    id: "notification_1",
    organizationId: "org_01",
    memberId: "member_hr",
    type: "LEAVE_REQUEST",
    category: "LEAVE",
    title: "Leave request pending",
    message: "Ben Iyer requested leave.",
    status: "UNREAD",
    actionUrl: "/kovan/leaves",
    entityType: "leave_request",
    entityId: "leave_req_pending_1",
    metadata: null,
    readAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
};

const offerTemplate = {
    id: "template_standard",
    name: "Standard Offer",
    description: "Default offer template",
    status: "ACTIVE",
    logoUrl: null,
    signatureUrl: null,
    signatoryName: null,
    signatoryTitle: null,
    footerHtml: null,
    websiteUrl: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    categories: [
        {
            id: "category_full_time",
            templateId: "template_standard",
            name: "Full Time",
            slug: "full-time",
            order: 1,
            sections: [],
        },
    ],
};

export const coreModuleHandlers = [
    http.get("*/dashboard", ({ request }) => {
        const url = new URL(request.url);
        coreModuleRequests.dashboardQueries.push(url.searchParams);
        return HttpResponse.json({
            today: url.searchParams.get("today") ?? "2026-06-10",
            capabilities: { attendanceOverview: true, leaveRequests: true, jobs: true },
            members: [memberAsha],
            attendanceToday: { items: [], total: 0, page: 1, page_size: 25 },
            approvedLeavesToday: { items: [], total: 0, page: 1, page_size: 25 },
            pendingLeaveRequests: { items: [], total: 0, page: 1, page_size: 25 },
            jobRequisitions: [],
            teamWeeklyPlanToday: [],
        });
    }),

    http.get("*/departments/meta", () =>
        HttpResponse.json({
            members: [memberAsha],
            departments: [{ id: "department_eng", name: "Engineering" }],
        }),
    ),
    http.get("*/departments", ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json({
            items: [departmentEngineering],
            total: 1,
            page: Number(url.searchParams.get("page") ?? 1),
            page_size: Number(url.searchParams.get("page_size") ?? 25),
        });
    }),
    http.post("*/departments", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.departmentCreates.push(body);
        return HttpResponse.json({ ...departmentEngineering, ...(body as object) }, { status: 201 });
    }),
    http.post("*/departments/:departmentId/members/bulk", async ({ params, request }) => {
        const body = await request.json();
        coreModuleRequests.departmentBulkAssignments.push({
            departmentId: String(params.departmentId),
            body,
        });
        return HttpResponse.json(departmentEngineering);
    }),

    http.get("*/employees/roles", () => HttpResponse.json([{ id: "role_hr", label: "HR Manager" }])),
    http.get("*/employees", () =>
        HttpResponse.json({
            items: [employeeAsha],
            total: 1,
            page: 1,
            page_size: 25,
        }),
    ),
    http.patch("*/employees/:targetMemberId/deactivate", ({ params }) => {
        coreModuleRequests.employeeDeactivateIds.push(String(params.targetMemberId));
        return HttpResponse.json({
            member_id: String(params.targetMemberId),
            name: "Asha Rao",
            email: "asha.rao@kovanlabs.com",
            status: "INACTIVE",
        });
    }),

    http.get("*/projects/meta", () =>
        HttpResponse.json({
            members: [memberAsha],
            departments: [{ id: "department_eng", name: "Engineering" }],
        }),
    ),
    http.get("*/projects", ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json({
            items: [projectPayroll],
            total: 1,
            page: Number(url.searchParams.get("page") ?? 1),
            page_size: Number(url.searchParams.get("page_size") ?? 25),
        });
    }),
    http.post("*/projects", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.projectCreates.push(body);
        return HttpResponse.json({ ...projectPayroll, ...(body as object) }, { status: 201 });
    }),
    http.post("*/projects/:projectId/members", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.projectMemberAdds.push(body);
        return HttpResponse.json(projectPayroll);
    }),
    http.post("*/projects/:projectId/tasks", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.projectTaskCreates.push(body);
        return HttpResponse.json({ id: "task_new", ...(body as object) }, { status: 201 });
    }),

    http.get("*/roles", () => HttpResponse.json([roleHr])),
    http.post("*/roles", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.roleCreates.push(body);
        return HttpResponse.json({ ...roleHr, id: "role_new", ...(body as object) }, { status: 201 });
    }),
    http.delete("*/roles/:roleId", ({ params }) => {
        coreModuleRequests.roleDeletes.push(String(params.roleId));
        return new HttpResponse(null, { status: 204 });
    }),

    http.get("*/microsoft-graph/settings", () =>
        HttpResponse.json({
            tenant_id: "tenant_1",
            client_id: "client_1",
            has_client_secret: true,
            enabled: true,
        }),
    ),
    http.put("*/microsoft-graph/settings", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.microsoftSettingsSaves.push(body);
        return HttpResponse.json({ ...(body as object), has_client_secret: true, enabled: true });
    }),
    http.post("*/microsoft-graph/test-connection", async ({ request }) => {
        const body = await request.json().catch(() => null);
        coreModuleRequests.microsoftConnectionTests.push(body);
        return HttpResponse.json({ success: true, message: "Connection ok" });
    }),
    http.get("*/microsoft-graph/sync-status", () =>
        HttpResponse.json({ lastSyncAt: nowIso, status: "IDLE", message: null }),
    ),

    http.get("*/notifications/unread-count", () => HttpResponse.json({ unreadCount: 1 })),
    http.get("*/notifications", ({ request }) => {
        const url = new URL(request.url);
        coreModuleRequests.notificationQueries.push({
            params: url.searchParams,
            memberId: request.headers.get("x-membership-id"),
        });
        return HttpResponse.json({ items: [notificationRecord], total: 1, unreadCount: 1 });
    }),
    http.post("*/notifications/:notificationId/read", ({ params }) => {
        coreModuleRequests.notificationReads.push(String(params.notificationId));
        return HttpResponse.json({ ...notificationRecord, id: String(params.notificationId), status: "READ", readAt: nowIso });
    }),
    http.post("*/notifications/read-all", () => HttpResponse.json({ updatedCount: 1 })),

    http.post("*/onboarding/pipeline/jobs/:jobSlug/stages/:stageSlug/send-requests", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.onboardingSends.push(body);
        return HttpResponse.json({ status: "queued", createdCount: 1 });
    }),
    http.post("*/onboarding/records/:recordId/assign", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.onboardingAssigns.push(body);
        return HttpResponse.json({ status: "assigned", recordId: "onboarding_1" });
    }),
    http.get("*/public/onboarding/:token", ({ params }) =>
        HttpResponse.json({
            token: String(params.token),
            candidateName: "Asha Rao",
            email: "asha.rao@kovanlabs.com",
            jobTitle: "QA Lead",
            status: "PENDING_DOCUMENTS",
        }),
    ),
    http.post("*/public/onboarding/:token/submit", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.onboardingDocumentSubmissions.push(body);
        return HttpResponse.json({ status: "submitted", message: "Documents submitted" });
    }),

    http.get("*/offers/templates", () => HttpResponse.json([offerTemplate])),
    http.post("*/offers/templates", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.offerTemplateCreates.push(body);
        return HttpResponse.json({ ...offerTemplate, ...(body as object) }, { status: 201 });
    }),
    http.post("*/offers/pipeline/jobs/:jobSlug/stages/:stageSlug/validate", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.offerDispatchValidations.push(body);
        return HttpResponse.json({
            valid: true,
            candidates: [{ applicationId: "app_1", status: "READY", messages: [] }],
            errors: [],
        });
    }),
    http.post("*/offers/pipeline/jobs/:jobSlug/stages/:stageSlug/dispatch", async ({ request }) => {
        const body = await request.json();
        coreModuleRequests.offerDispatches.push(body);
        return HttpResponse.json({ batchId: "offer_batch_1", queuedCount: 1 });
    }),

    http.post("*/resume-parser/process", () => {
        coreModuleRequests.resumeParserUploads.push({
            fileNames: ["asha.pdf"],
            template: "ncs",
        });
        return HttpResponse.json({
            processedFiles: ["asha.pdf"].map((fileName) => ({
                originalFilename: fileName,
                jsonUrl: `/resume-parser/${fileName}.json`,
                docxUrl: `/resume-parser/${fileName}.docx`,
                status: "success",
                messages: [],
            })),
        });
    }),
    http.get("*/resume-parser/history", ({ request }) => {
        const url = new URL(request.url);
        coreModuleRequests.resumeParserHistoryQueries.push(url.searchParams);
        return HttpResponse.json({
            scope: "organization",
            items: [
                {
                    id: "resume_history_1",
                    uploaderName: "HR Admin",
                    originalFilename: "asha.pdf",
                    jsonUrl: "/resume-parser/asha.json",
                    docxUrl: "/resume-parser/asha.docx",
                    status: "success",
                    messages: [],
                    createdAt: nowIso,
                },
            ],
        });
    }),
];
