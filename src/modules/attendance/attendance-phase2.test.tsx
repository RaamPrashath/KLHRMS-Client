import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClockInButton } from "@/modules/attendance/components/ClockInButton";
import { ClockOutButton } from "@/modules/attendance/components/ClockOutButton";
import { SelfAttendanceWeekView } from "@/modules/attendance/components/SelfAttendanceWeekView";
import { AttendanceReportPageShell } from "@/modules/attendance-report/components/AttendanceReportPageShell";
import { LeaveRequestsTable } from "@/modules/leave/components/LeaveRequestsTable";
import { WorkLogDirectoryTable } from "@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogDirectoryTable";
import type { AttendanceFiltersState } from "@/modules/attendance/types/attendanceTypes";
import type { WorkLogReportRow } from "@/modules/attendance/types/workLogReportTypes";
import type { LeaveRequestRecord } from "@/modules/leave/types/leaveTypes";
import {
    attendanceRequests,
    approvedLeaveRequest,
    pendingLeaveRequest,
    resetAttendanceRequests,
} from "@/test/msw/attendance-handlers";
import { authServer } from "@/test/msw/server";

const apiUrl = "http://localhost:8000";

const navigationMock = vi.hoisted(() => ({
    pathname: "/kovan/attendance-report",
    replace: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
    searchParams: new URLSearchParams(),
}));

const permissionMock = vi.hoisted(() => ({
    value: {
        attendanceReport: { view: "organization" },
        attendance: {
            view: "organization",
            create: "organization",
            edit: "organization",
            delete: "organization",
        },
    } as Record<string, Record<string, string>>,
}));

function buildQuery(params: Record<string, string | number | undefined | null>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== "") search.set(key, String(value));
    }
    const query = search.toString();
    return query ? `?${query}` : "";
}

async function jsonOrThrow<T>(response: Response): Promise<T> {
    if (response.ok) return response.json() as Promise<T>;
    let message = `Request failed with status ${response.status}`;
    try {
        const body = (await response.json()) as { detail?: unknown; message?: unknown };
        if (typeof body.detail === "string") message = body.detail;
        if (typeof body.message === "string") message = body.message;
    } catch {
        // Keep the generic status message.
    }
    throw new Error(JSON.stringify({ status: response.status, message }));
}

vi.mock("next/navigation", () => ({
    usePathname: () => navigationMock.pathname,
    useRouter: () => ({
        replace: navigationMock.replace,
    }),
    useSearchParams: () => navigationMock.searchParams,
}));

vi.mock("@/modules/attendance/api/attendanceServerActions", () => ({
    fetchMyAttendanceAction: async ({
        orgSlug,
        memberId,
        filters = {},
    }: {
        orgSlug: string;
        memberId: string;
        filters?: {
            date_from?: string;
            date_to?: string;
            status?: string;
            page?: number;
            page_size?: number;
        };
    }) => {
        const response = await fetch(
            `${apiUrl}/attendance/me${buildQuery({
                date_from: filters.date_from,
                date_to: filters.date_to,
                status: filters.status,
                page: filters.page,
                page_size: filters.page_size,
            })}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-organization-slug": orgSlug,
                    "x-membership-id": memberId,
                },
            },
        );
        return jsonOrThrow(response);
    },
    fetchAttendanceAction: async ({
        orgSlug,
        memberId,
        filters = {},
    }: {
        orgSlug: string;
        memberId: string;
        filters?: {
            target_member_id?: string;
            employee_name?: string;
            date_from?: string;
            date_to?: string;
            status?: string;
            page?: number;
            page_size?: number;
        };
    }) => {
        const response = await fetch(
            `${apiUrl}/attendance${buildQuery({
                target_member_id: filters.target_member_id,
                employee_name: filters.employee_name,
                date_from: filters.date_from,
                date_to: filters.date_to,
                status: filters.status,
                page: filters.page,
                page_size: filters.page_size,
            })}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-organization-slug": orgSlug,
                    "x-membership-id": memberId,
                },
            },
        );
        return jsonOrThrow(response);
    },
    fetchMemberPermissionsAction: async () => permissionMock.value,
    fetchMemberProfileAction: async () => ({ name: "Asha Rao" }),
    fetchAttendanceClockContextAction: async () => ({ plannedLocation: null, office: null }),
    clockInAction: async () => ({ ok: true, data: {} }),
    clockOutAction: async () => ({ ok: true, data: [] }),
    manualAttendanceAction: async ({
        orgSlug,
        memberId,
        data,
    }: {
        orgSlug: string;
        memberId: string;
        data: unknown;
    }) => {
        const response = await fetch(`${apiUrl}/attendance/day-entry`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-organization-slug": orgSlug,
                "x-membership-id": memberId,
            },
            body: JSON.stringify(data),
        });
        return jsonOrThrow(response);
    },
    deleteAttendanceAction: async ({
        orgSlug,
        memberId,
        data,
    }: {
        orgSlug: string;
        memberId: string;
        data: unknown;
    }) => {
        const response = await fetch(`${apiUrl}/attendance/day-entry`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "x-organization-slug": orgSlug,
                "x-membership-id": memberId,
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) await jsonOrThrow(response);
    },
}));

vi.mock("@/modules/leave/api/leaveServerActions", () => ({
    fetchHolidaysAction: async ({
        orgSlug,
        memberId,
        year,
        month,
        page,
        pageSize,
    }: {
        orgSlug: string;
        memberId: string;
        year?: number;
        month?: number;
        page?: number;
        pageSize?: number;
    }) => {
        const response = await fetch(
            `${apiUrl}/leaves/holidays${buildQuery({
                year,
                month,
                page,
                page_size: pageSize,
            })}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-organization-slug": orgSlug,
                    "x-membership-id": memberId,
                },
            },
        );
        return jsonOrThrow(response);
    },
    fetchLeaveRequestsAction: async ({
        orgSlug,
        memberId,
        filters = {},
    }: {
        orgSlug: string;
        memberId: string;
        filters?: {
            status?: string;
            memberId?: string;
            fromDate?: string;
            toDate?: string;
            page?: number;
            pageSize?: number;
        };
    }) => {
        const response = await fetch(
            `${apiUrl}/leaves/requests${buildQuery({
                status: filters.status,
                memberId: filters.memberId,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                page: filters.page,
                page_size: filters.pageSize,
            })}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-organization-slug": orgSlug,
                    "x-membership-id": memberId,
                },
            },
        );
        return jsonOrThrow(response);
    },
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
    const queryClient = createQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>,
    );
}

const defaultFilters: AttendanceFiltersState = {
    timePreset: "this_week",
    dateFrom: undefined,
    dateTo: undefined,
    status: undefined,
    targetMemberId: undefined,
    employeeNameSearch: undefined,
    page: 1,
    pageSize: 10,
};

function renderSelfAttendance(filters: AttendanceFiltersState = defaultFilters) {
    renderWithQueryClient(
        <SelfAttendanceWeekView
            orgSlug="kovan"
            memberId="member_1"
            filters={filters}
        />,
    );
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-10T09:00:00+05:30"));
    resetAttendanceRequests();
    navigationMock.replace.mockReset();
    navigationMock.searchParams = new URLSearchParams();
    permissionMock.value = {
        attendanceReport: { view: "organization" },
        attendance: {
            view: "organization",
            create: "organization",
            edit: "organization",
            delete: "organization",
        },
    };

    Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn(() => "blob:attendance-export"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("Self Attendance Week View", () => {
    it("freezes date math and displays present, absent, and leave states for the current week", async () => {
        renderSelfAttendance();

        expect(await screen.findAllByText("Present")).not.toHaveLength(0);
        expect(screen.getAllByText("Absent")).not.toHaveLength(0);
        expect(screen.getAllByText("On Leave")).not.toHaveLength(0);
        expect(screen.getAllByText("10 Jun")).not.toHaveLength(0);

        await waitFor(() => {
            expect(attendanceRequests.myAttendance).toHaveLength(1);
        });
        expect(attendanceRequests.myAttendance[0]?.get("date_from")).toBe("2026-06-08");
        expect(attendanceRequests.myAttendance[0]?.get("date_to")).toBe("2026-06-10");
    });

    it("keeps status filters stable against the mocked system date", async () => {
        renderSelfAttendance({
            ...defaultFilters,
            status: "ABSENT",
        });

        expect(await screen.findAllByText("Absent")).not.toHaveLength(0);
        expect(screen.getAllByText("On Leave")).not.toHaveLength(0);
        expect(screen.queryByText("Present")).not.toBeInTheDocument();
    });
});

describe("Clock Buttons", () => {
    it("exposes clock-in and clock-out actions as accessible buttons with pending states", async () => {
        const user = userEvent.setup();
        const onClockIn = vi.fn();
        const onClockOut = vi.fn();

        const { rerender } = render(
            <ClockInButton onClockIn={onClockIn} isPending={false} />,
        );

        await user.click(screen.getByRole("button", { name: /clock in now/i }));
        expect(onClockIn).toHaveBeenCalledTimes(1);

        rerender(<ClockOutButton onClockOut={onClockOut} isPending={true} />);

        const clockOut = screen.getByRole("button", { name: /clock out/i });
        expect(clockOut).toBeDisabled();
        await user.click(clockOut);
        expect(onClockOut).not.toHaveBeenCalled();
    });
});

describe("Leave Requests Table", () => {
    it("renders leave statuses and filters requests by leave type text", async () => {
        const user = userEvent.setup();
        const onRowClick = vi.fn();
        render(
            <LeaveRequestsTable
                requests={[approvedLeaveRequest, pendingLeaveRequest] satisfies LeaveRequestRecord[]}
                isLoading={false}
                onRowClick={onRowClick}
            />,
        );

        expect(screen.getByText("Approved")).toBeInTheDocument();
        expect(screen.getByText("Pending")).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText(/search by name/i), "sick");

        expect(screen.getByText("Sick Leave")).toBeInTheDocument();
        expect(screen.queryByText("Casual Leave")).not.toBeInTheDocument();
    });

    it("shows a semantic loading row for leave retrieval", () => {
        render(
            <LeaveRequestsTable
                requests={[]}
                isLoading={true}
                onRowClick={vi.fn()}
            />,
        );

        expect(screen.getByText("Loading leave requests...")).toBeInTheDocument();
    });
});

describe("Plan Timesheet Directory Table", () => {
    const workLogRows: WorkLogReportRow[] = [
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
    ];

    it("renders directory columns and opens a selected work-log row", async () => {
        const user = userEvent.setup();
        const onRowClick = vi.fn();

        render(
            <WorkLogDirectoryTable
                rows={workLogRows}
                isLoading={false}
                pageSize={10}
                onRowClick={onRowClick}
            />,
        );

        expect(screen.getByRole("columnheader", { name: /employee name/i })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: /clock-in/i })).toBeInTheDocument();
        await user.click(screen.getByRole("cell", { name: /asha rao/i }));

        expect(onRowClick).toHaveBeenCalledWith("attendance_2026_06_10_member_1");
    });

    it("uses table rows as loading skeleton placeholders", () => {
        render(
            <WorkLogDirectoryTable
                rows={[]}
                isLoading={true}
                pageSize={3}
                onRowClick={vi.fn()}
            />,
        );

        const table = screen.getByRole("table");
        expect(within(table).getAllByRole("row")).toHaveLength(4);
    });
});

describe("Attendance Report Bulk Selection", () => {
    it("selects multiple employees and posts the selected export payload through MSW", async () => {
        const user = userEvent.setup();
        renderWithQueryClient(
            <AttendanceReportPageShell orgSlug="kovan" memberId="member_hr" />,
        );

        expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
        expect(screen.getByText("Ben Iyer")).toBeInTheDocument();

        await user.click(screen.getByRole("checkbox", { name: /toggle asha rao/i }));
        await user.click(screen.getByRole("checkbox", { name: /toggle ben iyer/i }));
        await user.click(screen.getByRole("button", { name: /excel/i }));

        await waitFor(() => {
            expect(attendanceRequests.reportExports).toHaveLength(1);
        });
        expect(attendanceRequests.reportExports[0]?.mode).toBe("report");
        expect(attendanceRequests.reportExports[0]?.employees.map((employee) => employee.id)).toEqual([
            "member_1",
            "member_2",
        ]);
        expect(attendanceRequests.reportExports[0]?.rows).toHaveLength(2);
    });

    it("shows the report network failure indicator when log retrieval fails", async () => {
        authServer.use(
            http.get("*/attendance-report", () =>
                HttpResponse.json({ detail: "Report service unavailable" }, { status: 503 }),
            ),
        );

        renderWithQueryClient(
            <AttendanceReportPageShell orgSlug="kovan" memberId="member_hr" />,
        );

        expect(await screen.findByText("Failed to load attendance report.")).toBeInTheDocument();
    });
});
