import { http, HttpResponse } from "msw";
import type {
    AttendanceListResponse,
    AttendanceRecord,
} from "@/modules/attendance/types/attendanceTypes";
import type {
    AttendanceReportExportPayload,
    AttendanceReportListResponse,
    AttendanceReportOptionsResponse,
} from "@/modules/attendance-report/types";
import type {
    HolidayListResponse,
    LeaveRequestListResponse,
    LeaveRequestRecord,
    LeaveTypeRecord,
} from "@/modules/leave/types/leaveTypes";
import type { ProjectForAttendance } from "@/modules/projects/types/projectTypes";

const nowIso = "2026-06-10T06:30:00.000Z";

export const leaveTypeSick: LeaveTypeRecord = {
    id: "leave_type_sick",
    organizationId: "org_01",
    name: "Sick Leave",
    quota: 12,
    carryForward: false,
    isPaid: true,
    color: "#EA4335",
    createdAt: nowIso,
    updatedAt: nowIso,
};

export const leaveTypeCasual: LeaveTypeRecord = {
    id: "leave_type_casual",
    organizationId: "org_01",
    name: "Casual Leave",
    quota: 10,
    carryForward: false,
    isPaid: true,
    color: "#00874A",
    createdAt: nowIso,
    updatedAt: nowIso,
};

export const mockAttendanceRecords: AttendanceRecord[] = [
    {
        id: "attendance_2026_06_10_member_1",
        employeeId: "member_1",
        organizationId: "org_01",
        date: "2026-06-10",
        clockIn: "2026-06-10T03:30:00.000Z",
        clockOut: "2026-06-10T12:30:00.000Z",
        description: "Feature planning and QA pass",
        totalHours: 9,
        overtimeHours: 1,
        status: "PRESENT",
        isRemote: false,
        enteredByManagerId: null,
        createdAt: nowIso,
        employeeName: null,
    },
    {
        id: "attendance_2026_06_09_member_1",
        employeeId: "member_1",
        organizationId: "org_01",
        date: "2026-06-09",
        clockIn: null,
        clockOut: null,
        description: "No clock-in recorded",
        totalHours: 0,
        overtimeHours: 0,
        status: "ABSENT",
        isRemote: false,
        enteredByManagerId: null,
        createdAt: nowIso,
        employeeName: null,
    },
];

export const approvedLeaveRequest: LeaveRequestRecord = {
    id: "leave_req_approved_1",
    organizationId: "org_01",
    memberId: "member_1",
    leaveTypeId: leaveTypeSick.id,
    startDate: "2026-06-08",
    endDate: "2026-06-08",
    days: 1,
    reason: "Medical appointment",
    status: "APPROVED",
    approvedById: "member_hr",
    approverComment: null,
    cancelledAt: null,
    createdAt: "2026-06-07T09:00:00.000Z",
    updatedAt: "2026-06-07T10:00:00.000Z",
    member: {
        memberId: "member_1",
        userId: "user_1",
        name: "Asha Rao",
        email: "asha.rao@kovanlabs.com",
    },
    approver: {
        memberId: "member_hr",
        userId: "user_hr",
        name: "HR Admin",
        email: "hr@kovanlabs.com",
    },
    leaveType: leaveTypeSick,
};

export const pendingLeaveRequest: LeaveRequestRecord = {
    id: "leave_req_pending_1",
    organizationId: "org_01",
    memberId: "member_2",
    leaveTypeId: leaveTypeCasual.id,
    startDate: "2026-06-15",
    endDate: "2026-06-16",
    days: 2,
    reason: "Family event",
    status: "PENDING",
    approvedById: null,
    approverComment: null,
    cancelledAt: null,
    createdAt: "2026-06-06T09:00:00.000Z",
    updatedAt: "2026-06-06T09:00:00.000Z",
    member: {
        memberId: "member_2",
        userId: "user_2",
        name: "Ben Iyer",
        email: "ben.iyer@kovanlabs.com",
    },
    approver: null,
    leaveType: leaveTypeCasual,
};

export const attendanceReportOptions: AttendanceReportOptionsResponse = {
    employees: [
        { id: "member_1", name: "Asha Rao", email: "asha.rao@kovanlabs.com" },
        { id: "member_2", name: "Ben Iyer", email: "ben.iyer@kovanlabs.com" },
    ],
    projects: [
        {
            id: "project_payroll",
            name: "Payroll Revamp",
            members: [
                { id: "member_1", name: "Asha Rao", email: "asha.rao@kovanlabs.com" },
                { id: "member_2", name: "Ben Iyer", email: "ben.iyer@kovanlabs.com" },
            ],
        },
    ],
};

export const attendanceReportResponse: AttendanceReportListResponse = {
    items: [
        {
            attendanceRecordId: "attendance_2026_06_10_member_1",
            employeeId: "member_1",
            employeeName: "Asha Rao",
            employeeEmail: "asha.rao@kovanlabs.com",
            date: "2026-06-10",
            clockIn: "2026-06-10T03:30:00.000Z",
            clockOut: "2026-06-10T12:30:00.000Z",
            totalHours: 9,
            departmentName: "Engineering",
            projectName: "Payroll Revamp",
            taskName: "Calendar QA",
            clockOutDescription: "Completed regression pass",
        },
        {
            attendanceRecordId: "attendance_2026_06_10_member_2",
            employeeId: "member_2",
            employeeName: "Ben Iyer",
            employeeEmail: "ben.iyer@kovanlabs.com",
            date: "2026-06-10",
            clockIn: "2026-06-10T04:00:00.000Z",
            clockOut: "2026-06-10T11:30:00.000Z",
            totalHours: 7.5,
            departmentName: "Design",
            projectName: "Payroll Revamp",
            taskName: "Timesheet polish",
            clockOutDescription: "Reviewed bulk work logs",
        },
    ],
    total: 2,
    page: 1,
    page_size: 5000,
    summary: {
        total_days: 1,
        total_hours: 16.5,
        employee_count: 2,
    },
};

export const projectsForAttendance: ProjectForAttendance[] = [
    {
        id: "project_payroll",
        name: "Payroll Revamp",
        tasks: [
            { id: "task_calendar_qa", name: "Calendar QA" },
            { id: "task_timesheet_polish", name: "Timesheet polish" },
        ],
    },
];

export const attendanceRequests: {
    myAttendance: URLSearchParams[];
    reportQueries: URLSearchParams[];
    reportExports: AttendanceReportExportPayload[];
} = {
    myAttendance: [],
    reportQueries: [],
    reportExports: [],
};

export function resetAttendanceRequests() {
    attendanceRequests.myAttendance = [];
    attendanceRequests.reportQueries = [];
    attendanceRequests.reportExports = [];
}

export const attendanceHandlers = [
    http.get("*/attendance/me", ({ request }) => {
        const url = new URL(request.url);
        attendanceRequests.myAttendance.push(url.searchParams);

        const response: AttendanceListResponse = {
            items: mockAttendanceRecords,
            total: mockAttendanceRecords.length,
            page: Number(url.searchParams.get("page") ?? 1),
            page_size: Number(url.searchParams.get("page_size") ?? 200),
        };

        return HttpResponse.json(response, { status: 200 });
    }),

    http.get("*/leaves/holidays", ({ request }) => {
        const url = new URL(request.url);
        const response: HolidayListResponse = {
            items: [
                {
                    id: "holiday_founders_day",
                    organizationId: "org_01",
                    name: "Founders Day",
                    holidayDate: "2026-06-11",
                    isHoliday: true,
                    isRecurring: false,
                    description: null,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                },
            ],
            total: 1,
            page: Number(url.searchParams.get("page") ?? 1),
            page_size: Number(url.searchParams.get("page_size") ?? 50),
        };

        return HttpResponse.json(response, { status: 200 });
    }),

    http.get("*/leaves/requests", ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const all = [approvedLeaveRequest, pendingLeaveRequest];
        const items = status ? all.filter((request) => request.status === status) : all;
        const response: LeaveRequestListResponse = {
            items,
            total: items.length,
            page: Number(url.searchParams.get("page") ?? 1),
            page_size: Number(url.searchParams.get("page_size") ?? 50),
        };

        return HttpResponse.json(response, { status: 200 });
    }),

    http.get("*/attendance-report/options", () =>
        HttpResponse.json(attendanceReportOptions, { status: 200 }),
    ),

    http.get("*/attendance-report", ({ request }) => {
        const url = new URL(request.url);
        attendanceRequests.reportQueries.push(url.searchParams);

        return HttpResponse.json(attendanceReportResponse, { status: 200 });
    }),

    http.post("*/attendance-report/export", async ({ request }) => {
        const body = (await request.json()) as AttendanceReportExportPayload;
        attendanceRequests.reportExports.push(body);

        return new HttpResponse(new Blob(["attendance export"], { type: "text/plain" }), {
            status: 200,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    }),

    http.post("*/attendance/day-entry", async ({ request }) => {
        const body = (await request.json()) as {
            target_member_id: string;
            date: string;
            clock_in: string;
            clock_out: string;
        };

        return HttpResponse.json(
            {
                ...mockAttendanceRecords[0],
                id: `manual_${body.target_member_id}_${body.date}`,
                employeeId: body.target_member_id,
                date: body.date,
                clockIn: body.clock_in,
                clockOut: body.clock_out,
                totalHours: 8,
            } satisfies AttendanceRecord,
            { status: 200 },
        );
    }),

    http.delete("*/attendance/day-entry", () => new HttpResponse(null, { status: 204 })),

    http.get("*/projects/for-attendance", () =>
        HttpResponse.json(projectsForAttendance, { status: 200 }),
    ),

    http.get("*/attendance/bulk-work-logs", () =>
        HttpResponse.json(
            {
                days: [
                    {
                        date: "2026-06-10",
                        attendanceRecordId: "attendance_2026_06_10_member_1",
                        clockIn: "2026-06-10T03:30:00.000Z",
                        clockOut: "2026-06-10T12:30:00.000Z",
                        totalHours: 9,
                        overtimeHours: 1,
                        status: "PRESENT",
                        logs: [
                            {
                                id: "work_log_1",
                                startTime: "2026-06-10T03:30:00.000Z",
                                endTime: "2026-06-10T05:30:00.000Z",
                                projectId: "project_payroll",
                                projectTaskId: "task_calendar_qa",
                                title: "Calendar QA",
                                notes: "Regression pass",
                            },
                        ],
                    },
                ],
            },
            { status: 200 },
        ),
    ),

    http.post("*/attendance/bulk-work-logs", async ({ request }) => {
        const body = (await request.json()) as {
            days: Array<{
                date: string;
                logs: Array<{
                    startTime: string;
                    endTime: string;
                    projectId?: string;
                    projectTaskId?: string;
                    title?: string;
                    notes?: string;
                }>;
            }>;
        };

        return HttpResponse.json(
            {
                days: body.days.map((day) => ({
                    date: day.date,
                    attendanceRecordId: `attendance_${day.date}`,
                    clockIn: day.logs[0]?.startTime ?? null,
                    clockOut: day.logs.at(-1)?.endTime ?? null,
                    totalHours: day.logs.length,
                    overtimeHours: 0,
                    status: "PRESENT",
                    logs: day.logs.map((log, index) => ({
                        id: `saved_log_${index}`,
                        ...log,
                    })),
                })),
            },
            { status: 200 },
        );
    }),

    http.delete("*/attendance/bulk-work-logs/day", ({ request }) => {
        const url = new URL(request.url);
        const date = url.searchParams.get("day") ?? "unknown";

        return HttpResponse.json({ success: true, date }, { status: 200 });
    }),
];
