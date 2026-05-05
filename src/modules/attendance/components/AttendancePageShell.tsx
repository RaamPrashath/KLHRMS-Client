"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

import { fetchMemberPermissionsAction } from "@/modules/attendance/api/attendanceServerActions";
import {
    resolveAttendancePermissions,
    isOperativeScope,
} from "@/modules/attendance/utils/attendancePermissions";
import { useAttendanceQuery } from "@/modules/attendance/hooks/useAttendanceQuery";
import { useMyAttendanceQuery } from "@/modules/attendance/hooks/useMyAttendanceQuery";
import { useDeleteAttendanceMutation } from "@/modules/attendance/hooks/useDeleteAttendanceMutation";

import { AttendancePermissionGate } from "@/modules/attendance/components/AttendancePermissionGate";
import { AttendanceReportPanel } from "@/modules/attendance/components/AttendanceReportPanel";
import { ClockWidget } from "@/modules/attendance/components/ClockWidget";
import { ManualAttendanceForm } from "@/modules/attendance/components/ManualAttendanceForm";
import { AttendanceTable } from "@/modules/attendance/components/AttendanceTable";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type {
    AttendanceRecord,
    AttendanceFiltersState,
    ApiError,
} from "@/modules/attendance/types/attendanceTypes";

interface AttendancePageShellProps {
    orgSlug: string;
    memberId: string;
}

const DEFAULT_FILTERS: AttendanceFiltersState = {
    dateFrom: undefined,
    dateTo: undefined,
    status: undefined,
    targetMemberId: undefined,
    page: 1,
    pageSize: 20,
};

export function AttendancePageShell({
    orgSlug,
    memberId,
}: Readonly<AttendancePageShellProps>) {
    const shouldReduceMotion = useReducedMotion();

    // ── Permission resolution ──────────────────────────────────────────────────
    const { data: rawPermissions, isLoading: permissionsLoading } = useQuery({
        queryKey: ["member-permissions", orgSlug, memberId],
        queryFn: () => fetchMemberPermissionsAction({ orgSlug, memberId }),
        staleTime: 60_000,
    });

    const permissions = resolveAttendancePermissions(rawPermissions ?? {});
    const isOrgScope = permissions.view === "organization";

    // ── Filter state ───────────────────────────────────────────────────────────
    const [filters, setFilters] =
        useState<AttendanceFiltersState>(DEFAULT_FILTERS);

    // ── Query selection ────────────────────────────────────────────────────────
    const orgQuery = useAttendanceQuery(orgSlug, memberId, filters);
    const myQuery = useMyAttendanceQuery(orgSlug, memberId, filters);

    const {
        data: queryData,
        isLoading,
        isError,
        refetch,
    } = isOrgScope ? orgQuery : myQuery;

    // ── Delete state ───────────────────────────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(
        null,
    );
    const deleteMutation = useDeleteAttendanceMutation(orgSlug);

    // ── Manual form state ──────────────────────────────────────────────────────
    const [manualFormOpen, setManualFormOpen] = useState(false);

    // ── Latest record for ClockWidget ──────────────────────────────────────────
    const latestRecord: AttendanceRecord | null =
        queryData?.items && queryData.items.length > 0
            ? ([...queryData.items].sort((a, b) =>
                  b.date.localeCompare(a.date),
              )[0] ?? null)
            : null;

    // ── Delete handler ─────────────────────────────────────────────────────────
    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await deleteMutation.mutateAsync({
                orgSlug,
                memberId,
                targetMemberId: deleteTarget.employeeId,
                date: deleteTarget.date,
            });
            setDeleteTarget(null);
        } catch (err: unknown) {
            const apiErr = err as ApiError;
            if (apiErr.status === 404) {
                toast.error("Record not found");
                setDeleteTarget(null);
            }
        }
    }

    // ── Permission loading ─────────────────────────────────────────────────────
    if (permissionsLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-sm text-neutral-500">Loading…</p>
            </div>
        );
    }

    // ── No-view fallback ───────────────────────────────────────────────────────
    if (!isOperativeScope(permissions.view)) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-sm text-neutral-500">
                    You don&apos;t have permission to use this page.
                </p>
            </div>
        );
    }

    const motionProps = {
        initial: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 },
    };

    return (
        <>
            <main className="min-h-full bg-canvas">
                <div className="px-6 py-6 flex flex-col gap-6 max-w-6xl">
                    {/* Page heading */}
                    <section aria-labelledby="attendance-heading">
                        <h1
                            id="attendance-heading"
                            className="text-2xl font-semibold text-neutral-900 tracking-tight"
                        >
                            Attendance
                        </h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            Track and manage attendance records.
                        </p>
                    </section>

                    {/* Summary panel */}
                    <motion.div {...motionProps}>
                        <AttendanceReportPanel
                            items={queryData?.items}
                            isLoading={isLoading}
                            isError={isError}
                        />
                    </motion.div>

                    {/* Clock widget */}
                    <AttendancePermissionGate scope={permissions.create}>
                        <motion.div {...motionProps}>
                            <ClockWidget
                                orgSlug={orgSlug}
                                memberId={memberId}
                                initialRecord={latestRecord}
                            />
                        </motion.div>
                    </AttendancePermissionGate>

                    {/* Manual entry */}
                    <AttendancePermissionGate scope={permissions.edit}>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setManualFormOpen(true)}
                                className="bg-surface border border-primary text-primary hover:bg-primary-ghost text-sm font-medium px-4 py-2 rounded-md transition-colors duration-100"
                            >
                                Manual Entry
                            </button>
                        </div>
                        <ManualAttendanceForm
                            orgSlug={orgSlug}
                            memberId={memberId}
                            open={manualFormOpen}
                            onOpenChange={setManualFormOpen}
                        />
                    </AttendancePermissionGate>

                    {/* Table */}
                    <motion.div {...motionProps}>
                        <AttendanceTable
                            data={queryData}
                            isLoading={isLoading}
                            isError={isError}
                            onRetry={refetch}
                            filters={filters}
                            onFiltersChange={setFilters}
                            canEdit={isOperativeScope(permissions.edit)}
                            canDelete={isOperativeScope(permissions.delete)}
                            showEmployeeColumn={isOrgScope}
                            onEdit={() => {
                                setManualFormOpen(true);
                            }}
                            onDelete={(record) => setDeleteTarget(record)}
                        />
                    </motion.div>
                </div>
            </main>

            {/* Delete confirmation */}
            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete attendance record?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the record for{" "}
                            {deleteTarget?.date ?? ""}. This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting…" : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
