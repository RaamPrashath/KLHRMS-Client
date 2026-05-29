"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import {
    resolveAttendancePermissions,
    isOperativeScope,
} from "@/modules/attendance/utils/attendancePermissions";
import {
    useAttendanceQuery,
    useMemberPermissionsQuery,
    useMyAttendanceQuery,
} from "@/modules/attendance/hooks/queries/attendance";
import { useDeleteAttendanceMutation } from "@/modules/attendance/hooks/mutations/attendance";

import { AttendancePermissionGate } from "@/modules/attendance/components/AttendancePermissionGate";
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

function buildDefaultFilters(): AttendanceFiltersState {
    return {
        timePreset: 'all_time',
        dateFrom: undefined,
        dateTo: undefined,
        status: undefined,
        targetMemberId: undefined,
        employeeNameSearch: undefined,
        page: 1,
        pageSize: 20,
    };
}

export function AttendancePageShell({
    orgSlug,
    memberId,
}: Readonly<AttendancePageShellProps>) {
    const shouldReduceMotion = useReducedMotion();

    // ── Permission resolution ──────────────────────────────────────────────────
    const { data: rawPermissions, isLoading: permissionsLoading } =
        useMemberPermissionsQuery(orgSlug, memberId);

    const permissions = resolveAttendancePermissions(rawPermissions ?? {});
    const isOrgScope = permissions.view === "organization";

    // ── Filter state ───────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<AttendanceFiltersState>(buildDefaultFilters);

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
    const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
    const deleteMutation = useDeleteAttendanceMutation(orgSlug);

    // ── Manual form state ──────────────────────────────────────────────────────
    const [manualFormOpen, setManualFormOpen] = useState(false);

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
            let status = 0;
            let message = '';
            if (err instanceof Error) {
                try { ({ status, message } = JSON.parse(err.message) as ApiError); } catch { /* ignore */ }
            }
            if (status === 404) {
                toast.error("Record not found");
                setDeleteTarget(null);
            } else if (message) {
                toast.error(message);
            }
        }
    }

    // ── Permission loading ─────────────────────────────────────────────────────
    if (permissionsLoading) {
        return (
            <main className="min-h-full bg-canvas">
                <div className="flex flex-col gap-6 flex-1 min-h-full">
                    <div className="ml-7 mt-7 mr-7">
                        <div className="h-9 w-56 animate-pulse rounded-lg bg-neutral-100" />
                    </div>
                    <div className="mx-7">
                        <div className="h-32 animate-pulse rounded-2xl bg-neutral-100" />
                    </div>
                    <div className="mx-7 mb-7">
                        <div className="h-96 animate-pulse rounded-2xl bg-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]" />
                    </div>
                </div>
            </main>
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
                <div className="flex flex-col gap-6 flex-1 min-h-full">
                    <div className="flex items-start justify-between ml-7 mt-7 mr-7">
                        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
                            Who&apos;s in today?
                        </h1>

                        {isOperativeScope(permissions.create) && (
                            <Link
                                href={`/${orgSlug}/timesheet`}
                                className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary-ghost transition-colors duration-100 shrink-0"
                            >
                                <CalendarDays className="size-4" strokeWidth={1.5} />
                                Bulk attendance
                            </Link>
                        )}
                    </div>

                    <AttendancePermissionGate scope={permissions.create}>
                        <motion.div {...motionProps} className="mx-7">
                            <ClockWidget orgSlug={orgSlug} memberId={memberId} />
                        </motion.div>
                    </AttendancePermissionGate>

                    <AttendancePermissionGate scope={permissions.edit}>
                        <ManualAttendanceForm
                            orgSlug={orgSlug}
                            memberId={memberId}
                            open={manualFormOpen}
                            onOpenChange={setManualFormOpen}
                        />
                    </AttendancePermissionGate>

                    <motion.div {...motionProps}>
                        <AttendanceTable
                            orgSlug={orgSlug}
                            memberId={memberId}
                            data={queryData}
                            isLoading={isLoading}
                            isError={isError}
                            onRetry={refetch}
                            filters={filters}
                            onFiltersChange={setFilters}
                            canEdit={isOperativeScope(permissions.edit)}
                            canDelete={isOperativeScope(permissions.delete)}
                            showEmployeeColumn={isOrgScope}
                            onEdit={() => { setManualFormOpen(true); }}
                            onDelete={(record) => setDeleteTarget(record)}
                        />
                    </motion.div>
                </div>
            </main>

            <AlertDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete attendance record?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the record for{" "}
                            {deleteTarget?.date ?? ""}. This action cannot be undone.
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
