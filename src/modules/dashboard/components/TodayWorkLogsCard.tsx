"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getTodayIST } from "@/modules/attendance/utils/attendanceFormatters";
import { useBulkAttendanceData } from "@/modules/attendance/hooks/use-bulk-attendance-data";
import { useProjectsForAttendance } from "@/modules/projects/hooks/useProjectsForAttendance";
import { WorkLogDialog } from "@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogDialog";
import type { WorkLogFormValues } from "@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogForm";
import type {
    LocalWorkLog,
    WorkLogDialogState,
} from "@/modules/attendance/types/bulkAttendanceTypes";

interface TodayWorkLogsCardProps {
    orgSlug: string;
    memberId: string;
}

const CLOSED_DIALOG: WorkLogDialogState = {
    open: false,
    mode: "create",
    date: null,
    log: null,
};

function formatDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const totalMinutes = Math.floor(diffMs / 60_000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

export function TodayWorkLogsCard({
    orgSlug,
    memberId,
}: Readonly<TodayWorkLogsCardProps>) {
    const today = getTodayIST();

    const {
        dayMap,
        isLoading,
        saveDayLogs,
        deleteDayEntry,
        optimisticUpdateDay,
        rollbackDay,
    } = useBulkAttendanceData(orgSlug, memberId);

    const { data: projects = [], isLoading: isLoadingProjects } =
        useProjectsForAttendance(orgSlug, memberId);

    const [dialogState, setDialogState] =
        useState<WorkLogDialogState>(CLOSED_DIALOG);
    const [isSavingDialog, setIsSavingDialog] = useState(false);

    const todayData = dayMap.get(today);
    const logs = todayData?.logs ?? [];

    // Create a lookup map for projects and tasks
    const projectTaskMap = useMemo(() => {
        const map = new Map<
            string,
            { projectName: string; taskName: string }
        >();
        for (const project of projects) {
            for (const task of project.tasks) {
                map.set(`${project.id}-${task.id}`, {
                    projectName: project.name,
                    taskName: task.name,
                });
            }
        }
        return map;
    }, [projects]);

    const getLogTitle = useCallback(
        (log: LocalWorkLog): string => {
            if (log.projectId && log.projectTaskId) {
                const key = `${log.projectId}-${log.projectTaskId}`;
                const info = projectTaskMap.get(key);
                if (info) return `${info.projectName} - ${info.taskName}`;
            }
            return log.title || "No project selected";
        },
        [projectTaskMap],
    );

    // ── Open create dialog ───────────────────────────────────────────────────────
    const handleOpenCreate = useCallback(() => {
        const [y, m, d] = today.split("-").map(Number);
        const start = new Date(y!, m! - 1, d!, 9, 0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60_000);
        setDialogState({
            open: true,
            mode: "create",
            date: today,
            log: {
                id: crypto.randomUUID(),
                startTime: start,
                endTime: end,
                projectId: null,
                projectTaskId: null,
                title: null,
                notes: null,
                isOptimistic: true,
            },
        });
    }, [today]);

    // ── Open edit dialog ─────────────────────────────────────────────────────────
    const handleOpenEdit = useCallback(
        (log: LocalWorkLog) => {
            setDialogState({
                open: true,
                mode: "edit",
                date: today,
                log,
            });
        },
        [today],
    );

    // ── Close dialog ─────────────────────────────────────────────────────────────
    const handleCloseDialog = useCallback(() => {
        setDialogState(CLOSED_DIALOG);
    }, []);

    // ── Save from dialog ─────────────────────────────────────────────────────────
    const handleDialogSave = useCallback(
        async (date: string, values: WorkLogFormValues) => {
            setIsSavingDialog(true);

            const currentDay = dayMap.get(date) ?? null;
            const snapshot = currentDay
                ? { ...currentDay, logs: [...(currentDay.logs ?? [])] }
                : null;
            const existingLogs = currentDay?.logs ?? [];

            const newLog: LocalWorkLog = {
                id:
                    dialogState.mode === "edit" && dialogState.log
                        ? dialogState.log.id
                        : crypto.randomUUID(),
                startTime: values.startTime,
                endTime: values.endTime,
                projectId: values.projectId,
                projectTaskId: values.projectTaskId,
                title: null,
                notes: values.notes,
                isOptimistic: true,
            };

            let finalLogs: LocalWorkLog[];
            if (dialogState.mode === "edit" && dialogState.log) {
                finalLogs = existingLogs.map((l) =>
                    l.id === dialogState.log!.id ? newLog : l,
                );
            } else {
                finalLogs = [...existingLogs, newLog];
            }
            finalLogs.sort(
                (a, b) => a.startTime.getTime() - b.startTime.getTime(),
            );

            optimisticUpdateDay(date, () => ({
                date,
                attendanceRecordId: currentDay?.attendanceRecordId ?? null,
                clockIn: currentDay?.clockIn ?? null,
                clockOut: currentDay?.clockOut ?? null,
                totalHours: currentDay?.totalHours ?? null,
                overtimeHours: currentDay?.overtimeHours ?? null,
                status: currentDay?.status ?? null,
                logs: finalLogs,
            }));

            try {
                await saveDayLogs(date, finalLogs);
                setDialogState(CLOSED_DIALOG);
            } catch (err: unknown) {
                rollbackDay(date, snapshot);
                const msg =
                    (err as { message?: string }).message ??
                    "Failed to save work log";
                toast.error(msg);
            } finally {
                setIsSavingDialog(false);
            }
        },
        [dialogState, dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs],
    );

    // ── Delete log ───────────────────────────────────────────────────────────────
    const handleDeleteLog = useCallback(
        async (logId: string) => {
            const currentDay = dayMap.get(today) ?? null;
            const snapshot = currentDay
                ? { ...currentDay, logs: [...(currentDay.logs ?? [])] }
                : null;

            const remainingLogs = (currentDay?.logs ?? []).filter(
                (l) => l.id !== logId,
            );

            optimisticUpdateDay(today, (prev) => ({
                date: today,
                attendanceRecordId: prev?.attendanceRecordId ?? null,
                clockIn: prev?.clockIn ?? null,
                clockOut: prev?.clockOut ?? null,
                totalHours: prev?.totalHours ?? null,
                overtimeHours: prev?.overtimeHours ?? null,
                status: prev?.status ?? null,
                logs: remainingLogs,
            }));

            try {
                if (remainingLogs.length === 0) {
                    await deleteDayEntry(today);
                } else {
                    await saveDayLogs(today, remainingLogs);
                }
            } catch (err: unknown) {
                rollbackDay(today, snapshot);
                const msg =
                    (err as { message?: string }).message ??
                    "Failed to delete work log";
                toast.error(msg);
            }
        },
        [
            today,
            dayMap,
            optimisticUpdateDay,
            rollbackDay,
            saveDayLogs,
            deleteDayEntry,
        ],
    );

    const cardClasses =
        "relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 dark:border-zinc-800/60 dark:bg-[#0A0A0C] shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] flex flex-col";

    if (isLoading || isLoadingProjects) {
        return (
            <div className={cardClasses}>
                <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/60">
                    <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        Today&apos;s Work Logs
                    </h2>
                </div>
                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-850 p-6 space-y-4">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-16 w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cardClasses}>
                <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/60">
                    <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        Today&apos;s Work Logs
                    </h2>
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                        <Plus className="size-4" />
                        Add Log
                    </button>
                </div>

                <div className="p-6 flex-1">
                    {logs.length === 0 ? (
                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="flex min-h-[256px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-neutral-50/50 px-6 py-12 text-center transition-colors hover:bg-neutral-100/50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-900/30"
                        >
                            <div className="flex max-w-xs flex-col items-center">
                                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-zinc-900 text-neutral-400">
                                    <Clock className="size-5 text-neutral-400" />
                                </div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    No work logs yet
                                </p>
                                <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                                    Add your first log to track today&apos;s work.
                                </p>
                            </div>
                        </button>
                    ) : (
                        <div className="flex flex-col">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-start justify-between gap-4 border-t border-b border-black/4 py-4"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className="truncate text-sm font-medium text-neutral-900"
                                            title={getLogTitle(log)}
                                        >
                                            {getLogTitle(log)}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-2 text-[13px] text-neutral-500">
                                            <span className="tabular-nums">
                                                {format(
                                                    log.startTime,
                                                    "h:mm a",
                                                )}{" "}
                                                –{" "}
                                                {format(log.endTime, "h:mm a")}
                                            </span>
                                            <span>·</span>
                                            <span>
                                                {formatDuration(
                                                    log.startTime,
                                                    log.endTime,
                                                )}
                                            </span>
                                        </div>
                                        {log.notes && (
                                            <p
                                                className="mt-2 line-clamp-2 text-[13px] text-neutral-500"
                                                title={log.notes}
                                            >
                                                {log.notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(log)}
                                            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-black/[0.04] hover:text-neutral-700"
                                            aria-label={`Edit log: ${getLogTitle(log)}`}
                                        >
                                            <svg
                                                className="size-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeleteLog(log.id)
                                            }
                                            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                            aria-label={`Delete log: ${getLogTitle(log)}`}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <WorkLogDialog
                state={dialogState}
                projects={projects}
                onClose={handleCloseDialog}
                onSave={handleDialogSave}
                isPending={isSavingDialog}
            />
        </>
    );
}
