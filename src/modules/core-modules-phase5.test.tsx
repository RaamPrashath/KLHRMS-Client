import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    fetchAttendanceReportAction,
    exportAttendanceReportAction,
} from "@/modules/attendance-report/api";
import { fetchDashboardOverviewAction } from "@/modules/dashboard/api/dashboardServerActions";
import {
    bulkAssignDepartmentMembersAction,
    createDepartmentAction,
} from "@/modules/departments/api/departmentServerActions";
import {
    deactivateEmployeeAction,
    fetchEmployeesAction,
} from "@/modules/employees/api/employeeServerActions";
import {
    addProjectMemberAction,
    createProjectAction,
    createProjectTaskAction,
} from "@/modules/projects/api/projectServerActions";
import {
    createRoleAction,
    deleteRoleAction,
} from "@/modules/roles/api/roleServerActions";
import {
    fetchMicrosoftSettingsAction,
    fetchMicrosoftSyncStatusAction,
    saveMicrosoftSettingsAction,
    testMicrosoftConnectionAction,
} from "@/modules/microsoft-graph/api/microsoftGraphServerActions";
import {
    fetchNotificationsAction,
    fetchNotificationUnreadCountAction,
    markAllNotificationsReadAction,
    markNotificationReadAction,
} from "@/modules/notifications/api/notificationServerActions";
import {
    assignOnboardingCredentialsAction,
    fetchOnboardingPublicAction,
    sendOnboardingRequestsAction,
    submitOnboardingDocumentsAction,
} from "@/modules/onboarding/api/onboardingServerActions";
import {
    createOfferDispatchAction,
    createOfferTemplateAction,
    validateOfferDispatchAction,
} from "@/modules/offers/api/offerServerActions";
import { OfferSendConfirmDialog } from "@/modules/offers/components/OfferSendConfirmDialog";
import {
    fetchResumeParserHistoryAction,
    processResumeParserAction,
} from "@/modules/resume-parser/api/resumeParserServerActions";
import { KanbanBoard } from "@/modules/maintenance/kanban/KanbanBoard";
import { UserPasswordTab } from "@/modules/settings/components/UserPasswordTab";
import { parseAnnualSalaryInput, formatInrSalary } from "@/modules/jobs/utils/salaryParser";
import {
    composeTemplateHtml,
    findUnknownOfferTokens,
    splitPreviewPages,
} from "@/modules/offers/utils/offerTemplateRender";
import { resolveLeavePermissions, canApproveLeaves } from "@/modules/leave/utils/leavePermissions";
import { getMonthWeekdayDates, getWeekDays, shiftWeek } from "@/modules/weekly-plan/date";
import { PLAN_LOCATION_MAP } from "@/modules/weekly-plan/locations";
import { nextScope, normalizePermissionScopes } from "@/modules/roles/schema/roleSchemas";
import {
    attendanceRequests,
    resetAttendanceRequests,
} from "@/test/msw/attendance-handlers";
import {
    recruitmentRequests,
    resetRecruitmentRequests,
} from "@/test/msw/recruitment-handlers";
import {
    coreModuleRequests,
    resetCoreModuleRequests,
} from "@/test/msw/core-modules-handlers";

const setPasswordActionMock = vi.hoisted(() =>
    vi.fn(async () => ({ success: true, message: "Password updated successfully" })),
);

vi.mock("@/modules/settings/api/settingsServerActions", () => ({
    setPasswordAction: setPasswordActionMock,
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

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

vi.mock("@/lib/prisma", () => ({
    prisma: {
        member: { findUnique: vi.fn() },
        account: {
            findFirst: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
        },
        user: {
            create: vi.fn(),
            findMany: vi.fn(async () => []),
        },
        organization: {
            findUnique: vi.fn(async () => null),
        },
    },
}));

vi.mock("better-auth/crypto", () => ({
    hashPassword: vi.fn(async (value: string) => `hashed:${value}`),
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
    globalThis.ResizeObserver = class ResizeObserver {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
    };
}

beforeEach(() => {
    process.env.HRMS_API_URL = "http://localhost:8000";
    resetAttendanceRequests();
    resetRecruitmentRequests();
    resetCoreModuleRequests();
    setPasswordActionMock.mockClear();
    installDomMocks();
});

describe("Phase 5 cross-module API coverage", () => {
    it("tracks dashboard and attendance-report request parameters through MSW", async () => {
        const dashboard = await fetchDashboardOverviewAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            today: "2026-06-10",
        });
        expect(dashboard.today).toBe("2026-06-10");
        expect(coreModuleRequests.dashboardQueries[0]?.get("today")).toBe("2026-06-10");

        await fetchAttendanceReportAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            filters: {
                date_from: "2026-06-01",
                date_to: "2026-06-10",
                project_id: "project_payroll",
                employee_ids: ["member_1", "member_2"],
                page: 2,
                page_size: 50,
            },
        });
        expect(attendanceRequests.reportQueries).toHaveLength(1);
        expect(attendanceRequests.reportQueries[0].getAll("employee_id")).toEqual(["member_1", "member_2"]);
        expect(attendanceRequests.reportQueries[0].get("project_id")).toBe("project_payroll");

        const blob = await exportAttendanceReportAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            payload: {
                format: "xlsx",
                view_mode: "timesheet",
                date_from: "2026-06-01",
                date_to: "2026-06-10",
                employee_ids: ["member_1"],
                force_8_hours: true,
            },
        });
        expect(blob).toBeInstanceOf(Blob);
        expect(attendanceRequests.reportExports[0]).toEqual(
            expect.objectContaining({
                format: "xlsx",
                force_8_hours: true,
            }),
        );
    });

    it("normalizes departments, employees, projects, and role payloads before network calls", async () => {
        await createDepartmentAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            data: {
                name: "Engineering",
                headMemberId: "",
                parentDepartmentId: "",
                status: "ACTIVE",
            },
        });
        expect(coreModuleRequests.departmentCreates[0]).toEqual(
            expect.objectContaining({
                name: "Engineering",
                headMemberId: null,
                parentDepartmentId: null,
            }),
        );

        await bulkAssignDepartmentMembersAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            departmentId: "department_eng",
            memberIds: ["member_1", "member_2"],
        });
        expect(coreModuleRequests.departmentBulkAssignments[0]).toEqual({
            departmentId: "department_eng",
            body: { memberIds: ["member_1", "member_2"] },
        });

        const employees = await fetchEmployeesAction({ orgSlug: "kovan", memberId: "member_hr" });
        expect(employees.items[0]?.image).toBe("http://localhost:8000/uploads/asha.png");
        await deactivateEmployeeAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            targetMemberId: "member_1",
        });
        expect(coreModuleRequests.employeeDeactivateIds).toEqual(["member_1"]);

        await createProjectAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            data: {
                name: "Payroll Revamp",
                clientName: "   ",
                budget: 250000,
                budgetedHours: 320,
                startDate: "",
                endDate: "",
                status: "ACTIVE",
                billable: true,
                description: "",
            },
        });
        expect(coreModuleRequests.projectCreates[0]).toEqual(
            expect.objectContaining({
                clientName: null,
                startDate: null,
                endDate: null,
                description: null,
            }),
        );

        await addProjectMemberAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            projectId: "project_payroll",
            data: { memberId: "member_1", role: "QA Lead", allocatedHours: 40 },
        });
        await createProjectTaskAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            projectId: "project_payroll",
            data: { name: "Regression pass" },
        });
        expect(coreModuleRequests.projectMemberAdds[0]).toEqual(
            expect.objectContaining({ memberId: "member_1", role: "QA Lead" }),
        );
        expect(coreModuleRequests.projectTaskCreates[0]).toEqual({ name: "Regression pass" });

        await expect(
            createRoleAction({
                orgSlug: "kovan",
                memberId: "member_hr",
                data: { name: "", permissions: { employees: { view: "none" } } },
            }),
        ).rejects.toMatchObject({ status: 400 });
        expect(coreModuleRequests.roleCreates).toHaveLength(0);

        await createRoleAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            data: { name: "Department Lead", permissions: { employees: { view: "team" } } },
        });
        expect(coreModuleRequests.roleCreates[0]).toEqual(
            expect.objectContaining({
                permissions: { employees: { view: "department" } },
            }),
        );
        await deleteRoleAction({ orgSlug: "kovan", memberId: "member_hr", roleId: "role_new" });
        expect(coreModuleRequests.roleDeletes).toEqual(["role_new"]);
    });

    it("covers Microsoft Graph and notifications endpoints with membership-derived headers", async () => {
        await fetchMicrosoftSettingsAction({ orgSlug: "kovan", memberId: "member_hr" });
        await fetchMicrosoftSyncStatusAction({ orgSlug: "kovan", memberId: "member_hr" });
        await saveMicrosoftSettingsAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            data: {
                tenant_id: "tenant_saved",
                client_id: "client_saved",
                client_secret: "secret_saved",
            },
        });
        await testMicrosoftConnectionAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            credentials: {
                tenant_id: "tenant_saved",
                client_id: "client_saved",
                client_secret: "secret_saved",
            },
        });

        expect(coreModuleRequests.microsoftSettingsSaves[0]).toEqual(
            expect.objectContaining({ tenant_id: "tenant_saved" }),
        );
        expect(coreModuleRequests.microsoftConnectionTests[0]).toEqual(
            expect.objectContaining({ client_id: "client_saved" }),
        );

        const list = await fetchNotificationsAction({
            orgSlug: "kovan",
            memberId: "ignored",
            status: "unread",
            limit: 10,
            offset: 5,
        });
        expect(list.unreadCount).toBe(1);
        expect(coreModuleRequests.notificationQueries[0]?.params.get("status")).toBe("unread");
        expect(coreModuleRequests.notificationQueries[0]?.params.get("limit")).toBe("10");
        expect(coreModuleRequests.notificationQueries[0]?.memberId).toBe("member_hr");

        expect(await fetchNotificationUnreadCountAction({ orgSlug: "kovan", memberId: "ignored" }))
            .toEqual({ unreadCount: 1 });
        await markNotificationReadAction({
            orgSlug: "kovan",
            memberId: "ignored",
            notificationId: "notification_1",
        });
        expect(coreModuleRequests.notificationReads).toEqual(["notification_1"]);
        expect(await markAllNotificationsReadAction({ orgSlug: "kovan", memberId: "ignored" }))
            .toEqual({ updatedCount: 1 });
    });

    it("validates onboarding requests and document submissions before and after MSW", async () => {
        await expect(
            sendOnboardingRequestsAction({
                orgSlug: "kovan",
                memberId: "member_hr",
                jobSlug: "qa-lead",
                stageSlug: "onboarding",
                data: { applicationIds: [] },
            }),
        ).rejects.toThrow("Select at least one candidate");
        expect(coreModuleRequests.onboardingSends).toHaveLength(0);

        await sendOnboardingRequestsAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            jobSlug: "qa-lead",
            stageSlug: "onboarding",
            data: { applicationIds: ["app_1"] },
        });
        expect(recruitmentRequests.onboardingSends).toEqual([{ applicationIds: ["app_1"] }]);

        await expect(
            assignOnboardingCredentialsAction({
                orgSlug: "kovan",
                memberId: "member_hr",
                recordId: "onboarding_1",
                data: { roleId: "role_hr", email: "not-an-email" },
            }),
        ).rejects.toThrow("Invalid email");
        await assignOnboardingCredentialsAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            recordId: "onboarding_1",
            data: { roleId: "role_hr", email: "asha.rao@kovanlabs.com" },
        });
        expect(coreModuleRequests.onboardingAssigns[0]).toEqual({
            roleId: "role_hr",
            email: "asha.rao@kovanlabs.com",
        });

        const publicOnboarding = await fetchOnboardingPublicAction("public_token_1");
        expect(publicOnboarding.candidateName).toBe("Meera Iyer");
        await submitOnboardingDocumentsAction({
            token: "public_token_1",
            data: {
                aadharBase64: "data:application/pdf;base64,YQ==",
                aadharFileName: "aadhar.pdf",
                panBase64: "data:application/pdf;base64,cA==",
                panFileName: "pan.pdf",
            },
        });
        expect(recruitmentRequests.onboardingDocumentSubmissions[0]).toEqual(
            expect.objectContaining({ aadharFileName: "aadhar.pdf", panFileName: "pan.pdf" }),
        );
    });

    it("validates offer template creation and offer dispatch payloads", async () => {
        await expect(
            createOfferTemplateAction({
                orgSlug: "kovan",
                memberId: "member_hr",
                data: { name: "" },
            }),
        ).rejects.toThrow("Too small");
        expect(coreModuleRequests.offerTemplateCreates).toHaveLength(0);

        await createOfferTemplateAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            data: {
                name: "Standard Offer",
                description: "Default offer letter",
                status: "ACTIVE",
                categories: [{ name: "Full Time", slug: "full-time", order: 1 }],
            },
        });
        const dispatchPayload = {
            templateId: "template_standard",
            categoryId: "category_full_time",
            applicationIds: ["app_1"],
            expiresAt: "2026-07-10T00:00:00.000Z",
        };
        await validateOfferDispatchAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            jobSlug: "qa-lead",
            stageSlug: "offer",
            data: dispatchPayload,
        });
        await createOfferDispatchAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            jobSlug: "qa-lead",
            stageSlug: "offer",
            data: dispatchPayload,
        });
        expect(coreModuleRequests.offerTemplateCreates[0]).toEqual(
            expect.objectContaining({ name: "Standard Offer", status: "ACTIVE" }),
        );
        expect(coreModuleRequests.offerDispatchValidations).toEqual([dispatchPayload]);
        expect(coreModuleRequests.offerDispatches).toEqual([dispatchPayload]);
    });

    it("processes resume-parser uploads and history filters through MSW", async () => {
        const formData = new FormData();
        formData.append("files", new File(["resume"], "asha.pdf", { type: "application/pdf" }));
        formData.append("template", "ncs");
        const parserResult = await processResumeParserAction({
            orgSlug: "kovan",
            memberId: "member_hr",
            formData,
        });
        expect(parserResult.processedFiles[0]?.originalFilename).toBe("asha.pdf");
        expect(coreModuleRequests.resumeParserUploads[0]).toEqual({
            fileNames: ["asha.pdf"],
            template: "ncs",
        });

        await fetchResumeParserHistoryAction({ orgSlug: "kovan", memberId: "member_hr", limit: 25 });
        expect(coreModuleRequests.resumeParserHistoryQueries[0]?.get("limit")).toBe("25");
    });
});

describe("Phase 5 utility and component coverage", () => {
    it("keeps shared schema utilities deterministic across jobs, offers, leave, roles, and weekly-plan", () => {
        expect(parseAnnualSalaryInput("12.5 lakh")).toBe(1250000);
        expect(parseAnnualSalaryInput("1 cr 25 lakh")).toBe(12500000);
        expect(parseAnnualSalaryInput("12 apples")).toBeNull();
        expect(formatInrSalary(1250000)).toBe("12,50,000");

        const html = composeTemplateHtml(
            {
                id: "template_standard",
                organizationId: "org_1",
                name: "Standard Offer",
                description: null,
                status: "ACTIVE",
                logoUrl: null,
                signatureUrl: null,
                signatoryName: null,
                signatoryTitle: null,
                lastUsedAt: null,
                footerHtml: "Welcome {{ candidate.firstName }}",
                websiteUrl: null,
                createdByMemberId: null,
                updatedByMemberId: null,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
                categories: [],
                sections: [
                    {
                        id: "section_1",
                        organizationId: "org_1",
                        templateId: "template_standard",
                        categoryId: "category_full_time",
                        sectionKey: "intro",
                        sectionName: "Intro",
                        order: 1,
                        tiptapJson: {
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [{ type: "text", text: "Hello {{candidate.firstName}}" }],
                                },
                                { type: "pageBreak" },
                            ],
                        },
                        html: "",
                        createdAt: "2026-06-10T06:30:00.000Z",
                        updatedAt: "2026-06-10T06:30:00.000Z",
                    },
                ],
            },
            {
                id: "category_full_time",
                organizationId: "org_1",
                templateId: "template_standard",
                name: "Full Time",
                slug: "full-time",
                order: 1,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
            },
        );
        expect(html).toContain("Hello Ananya");
        const personalizedHtml = composeTemplateHtml(
            {
                id: "template_personalized",
                organizationId: "org_1",
                name: "Personalized Offer",
                description: null,
                status: "ACTIVE",
                logoUrl: null,
                signatureUrl: null,
                signatoryName: null,
                signatoryTitle: null,
                lastUsedAt: null,
                footerHtml: "<p>Generated {{ offer.generatedDate }}</p>",
                websiteUrl: null,
                createdByMemberId: null,
                updatedByMemberId: null,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
                categories: [],
                sections: [
                    {
                        id: "section_personalized",
                        organizationId: "org_1",
                        templateId: "template_personalized",
                        categoryId: "category_full_time",
                        sectionKey: "intro",
                        sectionName: "Intro",
                        order: 1,
                        tiptapJson: {},
                        html: "<p>Dear {{ candidate.firstName }} {{candidate.lastName}}</p><p>{{job.salaryMin}} - {{ job.salaryMax }} {{job.currency}}</p>",
                        createdAt: "2026-06-10T06:30:00.000Z",
                        updatedAt: "2026-06-10T06:30:00.000Z",
                    },
                ],
            },
            {
                id: "category_full_time",
                organizationId: "org_1",
                templateId: "template_personalized",
                name: "Full Time",
                slug: "full-time",
                order: 1,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
            },
            {
                firstName: "Rajaram",
                lastName: "A",
                generatedDate: "18 Jun 2026",
                salaryMin: "12,00,000",
                salaryMax: "16,00,000",
                currency: "INR",
            },
        );
        expect(personalizedHtml).toContain("Dear Rajaram A");
        expect(personalizedHtml).toContain("12,00,000 - 16,00,000 INR");
        expect(personalizedHtml).toContain("Generated 18 Jun 2026");
        const htmlWithAssets = composeTemplateHtml(
            {
                id: "template_assets",
                organizationId: "org_1",
                name: "Asset Offer",
                description: null,
                status: "ACTIVE",
                logoUrl: "https://cdn.example.com/logo.png",
                signatureUrl: "https://cdn.example.com/signature.png",
                signatoryName: "Asha Rao",
                signatoryTitle: "HR",
                lastUsedAt: null,
                footerHtml: "<div><p>(Asha Rao)</p><p>HR</p></div>",
                websiteUrl: null,
                createdByMemberId: null,
                updatedByMemberId: null,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
                categories: [],
                sections: [
                    {
                        id: "section_assets",
                        organizationId: "org_1",
                        templateId: "template_assets",
                        categoryId: "category_assets",
                        sectionKey: "metadata",
                        sectionName: "Metadata",
                        order: 1,
                        tiptapJson: {},
                        html: "<h2>Offer Letter</h2><p>{{offer.generatedDate}}</p><p>Coimbatore</p>",
                        createdAt: "2026-06-10T06:30:00.000Z",
                        updatedAt: "2026-06-10T06:30:00.000Z",
                    },
                ],
            },
            {
                id: "category_assets",
                organizationId: "org_1",
                templateId: "template_assets",
                name: "Assets",
                slug: "assets",
                order: 1,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
            },
            {
                firstName: "Rajaram",
                lastName: "A",
                generatedDate: "18 Jun 2026",
                salaryMin: "12,00,000",
                salaryMax: "16,00,000",
                currency: "INR",
            },
        );
        expect(htmlWithAssets).toContain('class="offer-letter-logo" src="https://cdn.example.com/logo.png"');
        expect(htmlWithAssets).toContain('<p class="offer-signature-closing">Sincerely,</p><img src="https://cdn.example.com/signature.png"');
        const footerLayoutHtml = composeTemplateHtml(
            {
                id: "template_footer_layout",
                organizationId: "org_1",
                name: "Footer Layout Offer",
                description: null,
                status: "ACTIVE",
                logoUrl: null,
                signatureUrl: null,
                signatoryName: null,
                signatoryTitle: null,
                lastUsedAt: null,
                footerHtml: (
                    '<div class="offer-letter-footer">'
                    + '<div class="offer-signature-slot"><p class="offer-signature-name">(Asha Rao)</p><p>HR</p></div>'
                    + '<div class="offer-footer-address"><p>Kovan Technology Labs India Private Limited</p><p>Coimbatore</p></div>'
                    + '<a class="offer-footer-website" href="http://www.kovanlabs.com">www.kovanlabs.com</a>'
                    + "</div>"
                ),
                websiteUrl: "http://www.kovanlabs.com",
                createdByMemberId: null,
                updatedByMemberId: null,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
                categories: [],
                sections: [
                    {
                        id: "section_footer_layout",
                        organizationId: "org_1",
                        templateId: "template_footer_layout",
                        categoryId: "category_assets",
                        sectionKey: "intro",
                        sectionName: "Intro",
                        order: 1,
                        tiptapJson: {},
                        html: "<p>Hello {{candidate.firstName}}</p>",
                        createdAt: "2026-06-10T06:30:00.000Z",
                        updatedAt: "2026-06-10T06:30:00.000Z",
                    },
                ],
            },
            {
                id: "category_assets",
                organizationId: "org_1",
                templateId: "template_footer_layout",
                name: "Assets",
                slug: "assets",
                order: 1,
                createdAt: "2026-06-10T06:30:00.000Z",
                updatedAt: "2026-06-10T06:30:00.000Z",
            },
        );
        expect(footerLayoutHtml).toContain('<p class="offer-signature-closing">Sincerely,</p><p class="offer-signature-name">(Asha Rao)</p><p>HR</p>');
        expect(footerLayoutHtml).toContain('class="offer-footer-address"');
        expect(footerLayoutHtml).toContain('class="offer-footer-website" href="http://www.kovanlabs.com"');
        expect(splitPreviewPages(html)).toHaveLength(2);
        expect(findUnknownOfferTokens("{{ candidate.firstName }} {{ candidate.middleName }}"))
            .toEqual(["candidate.middleName"]);

        const permissions = resolveLeavePermissions({
            leaves: { view: "org", create: "self", approve: "department" },
        });
        expect(permissions).toEqual({ view: "organization", create: "self", approve: "department" });
        expect(canApproveLeaves(permissions.approve)).toBe(false);
        expect(canApproveLeaves("organization")).toBe(true);

        expect(nextScope("department")).toBe("organization");
        expect(normalizePermissionScopes({ employees: { view: "team" } }))
            .toEqual({ employees: { view: "department" } });

        expect(getWeekDays(2026, 24).map((day) => day.iso)).toEqual([
            "2026-06-08",
            "2026-06-09",
            "2026-06-10",
            "2026-06-11",
            "2026-06-12",
        ]);
        expect(shiftWeek(2026, 1, -1)).toEqual({ year: 2025, week: 52 });
        expect(getMonthWeekdayDates(2026, 6)).not.toContain("2026-06-07");
        expect(PLAN_LOCATION_MAP.WFH.short_label).toBe("WFH");
    });

    it("opens candidate-specific offer previews from the send confirmation dialog", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        const onNameOverrideSave = vi.fn();
        const category = {
            id: "category_full_time",
            organizationId: "org_1",
            templateId: "template_standard",
            name: "Full Time",
            slug: "full-time",
            order: 1,
            createdAt: "2026-06-10T06:30:00.000Z",
            updatedAt: "2026-06-10T06:30:00.000Z",
        };
        const template = {
            id: "template_standard",
            organizationId: "org_1",
            name: "Standard Offer",
            description: null,
            status: "ACTIVE",
            logoUrl: "https://cdn.example.com/logo.png",
            signatureUrl: "https://cdn.example.com/signature.png",
            signatoryName: null,
            signatoryTitle: null,
            websiteUrl: null,
            createdByMemberId: null,
            updatedByMemberId: null,
            lastUsedAt: null,
            footerHtml: "<div><p>(Asha Rao)</p><p>HR</p></div>",
            createdAt: "2026-06-10T06:30:00.000Z",
            updatedAt: "2026-06-10T06:30:00.000Z",
            categories: [category],
            sections: [
                {
                    id: "section_1",
                    organizationId: "org_1",
                    templateId: "template_standard",
                    categoryId: "category_full_time",
                    sectionKey: "metadata",
                    sectionName: "Metadata",
                    order: 1,
                    tiptapJson: {},
                    html: "<h2>Offer Letter</h2><p>{{offer.generatedDate}}</p><p>Coimbatore</p>",
                    createdAt: "2026-06-10T06:30:00.000Z",
                    updatedAt: "2026-06-10T06:30:00.000Z",
                },
                {
                    id: "section_2",
                    organizationId: "org_1",
                    templateId: "template_standard",
                    categoryId: "category_full_time",
                    sectionKey: "intro",
                    sectionName: "Intro",
                    order: 2,
                    tiptapJson: {},
                    html: "<p>Dear {{candidate.firstName}} {{candidate.lastName}}</p><p>{{job.salaryMin}} - {{job.salaryMax}} {{job.currency}}</p>",
                    createdAt: "2026-06-10T06:30:00.000Z",
                    updatedAt: "2026-06-10T06:30:00.000Z",
                },
            ],
        };

        render(
            <OfferSendConfirmDialog
                open
                validation={{
                    validCandidates: [
                        {
                            applicationId: "application_1",
                            candidate: {
                                id: "candidate_1",
                                firstName: "Rajaram",
                                lastName: "A",
                                email: "candidate1@gmail.com",
                                resumeUrl: null,
                            },
                            eligibility: { canSend: true, errors: [], warnings: [] },
                        },
                    ],
                    blockedCandidates: [],
                    warnings: [],
                }}
                sending={false}
                template={template}
                category={category}
                renderData={{
                    firstName: "",
                    lastName: "",
                    generatedDate: "18 Jun 2026",
                    salaryMin: "12,00,000",
                    salaryMax: "16,00,000",
                    currency: "INR",
                }}
                nameOverrides={{}}
                onOpenChange={vi.fn()}
                onNameOverrideSave={onNameOverrideSave}
                onConfirm={onConfirm}
            />,
        );

        expect(screen.queryByText("Ready")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /preview/i }));
        expect(await screen.findByText("Offer letter preview")).toBeInTheDocument();
        expect(screen.getByText("Dear Rajaram A")).toBeInTheDocument();
        expect(screen.getByText("12,00,000 - 16,00,000 INR")).toBeInTheDocument();
        const logo = document.querySelector('img.offer-letter-logo');
        expect(logo).toHaveAttribute("src", "https://cdn.example.com/logo.png");
        expect(document.querySelector('img[src="https://cdn.example.com/signature.png"]')).toBeInTheDocument();

        const nameInput = screen.getByRole("textbox", { name: /offer preview candidate name/i });
        await user.clear(nameInput);
        await user.type(nameInput, "Raja Kumar");
        expect(screen.getByText("Dear Raja Kumar")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /^save$/i }));
        expect(onNameOverrideSave).toHaveBeenCalledWith("application_1", "Raja Kumar");

        await user.click(screen.getByRole("button", { name: /^send offers$/i }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("renders maintenance kanban columns and assigned issue cards", () => {
        render(
            <KanbanBoard
                search=""
                collapsed={{}}
                onToggleColumn={vi.fn()}
                onUpdateMaintenance={vi.fn(async () => undefined)}
                tickets={[
                    {
                        id: "ticket_asset_1",
                        ticketId: "AST-1001",
                        ticketMode: "ASSET_ISSUE",
                        assetId: "asset_laptop_1",
                        assetName: "Dell Latitude 5450",
                        assetCode: "AST-LAP",
                        subject: "Laptop charger not working",
                        maintenanceType: "REPAIR",
                        issueDescription: "Critical charger failure during meetings.",
                        status: "OPEN",
                        serviceDate: "2026-06-10",
                        createdAt: "2026-06-10T06:30:00.000Z",
                        updatedAt: "2026-06-10T06:30:00.000Z",
                        loggedByName: "Asha Rao",
                        loggedByEmail: "asha.rao@kovanlabs.com",
                        assetCondition: "GOOD",
                        assetLifecycleStatus: "ASSIGNED",
                        assetLifecycleStatusLabel: "Assigned",
                        cancelledByMemberId: null,
                        cancelledByName: null,
                        swapPreview: null,
                    } as never,
                ]}
            />,
        );

        expect(screen.getByText("Open")).toBeInTheDocument();
        expect(screen.getByText("In Progress")).toBeInTheDocument();
        expect(screen.getByText("Done")).toBeInTheDocument();
        expect(screen.getByText("Cancelled")).toBeInTheDocument();
        expect(screen.getByText("Dell Latitude 5450")).toBeInTheDocument();
        expect(screen.getByText("AST-1001")).toBeInTheDocument();
        expect(screen.getByText("Assigned")).toBeInTheDocument();
    });

    it("enforces password rules before saving account settings", async () => {
        const user = userEvent.setup();
        renderWithQueryClient(<UserPasswordTab orgSlug="kovan" memberId="member_hr" />);

        const saveButton = screen.getByRole("button", { name: /^save password$/i });
        expect(saveButton).toBeDisabled();

        await user.type(screen.getByLabelText(/^new password$/i), "weak");
        await user.type(screen.getByLabelText(/^confirm new password$/i), "weak");
        expect(saveButton).toBeDisabled();
        expect(setPasswordActionMock).not.toHaveBeenCalled();

        await user.clear(screen.getByLabelText(/^new password$/i));
        await user.clear(screen.getByLabelText(/^confirm new password$/i));
        await user.type(screen.getByLabelText(/^new password$/i), "Str0ng!Pass");
        await user.type(screen.getByLabelText(/^confirm new password$/i), "Str0ng!Pass");

        expect(saveButton).toBeEnabled();
        await user.click(saveButton);

        await waitFor(() => {
            expect(setPasswordActionMock).toHaveBeenCalledWith({
                orgSlug: "kovan",
                memberId: "member_hr",
                newPassword: "Str0ng!Pass",
            });
        });
    });
});
