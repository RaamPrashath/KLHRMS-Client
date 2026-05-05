"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useClockInMutation } from "@/modules/attendance/hooks/useClockInMutation";
import { useClockOutMutation } from "@/modules/attendance/hooks/useClockOutMutation";
import { fetchMyAttendanceAction } from "@/modules/attendance/api/attendanceServerActions";
import {
    formatElapsed,
    formatTime,
    formatWorkedDuration,
    formatTodayLabel,
    getTodayIST,
} from "@/modules/attendance/utils/attendanceFormatters";
import { ClockInButton } from "@/modules/attendance/components/ClockInButton";
import { ClockOutButton } from "@/modules/attendance/components/ClockOutButton";
import type {
    AttendanceRecord,
    ApiError,
} from "@/modules/attendance/types/attendanceTypes";

type WidgetState = "LOADING" | "NOT_CLOCKED_IN" | "CLOCKED_IN" | "COMPLETED";

interface ClockWidgetProps {
    orgSlug: string;
    memberId: string;
}

function deriveWidgetState(
    record: AttendanceRecord | null | undefined,
): Exclude<WidgetState, "LOADING"> {
    if (!record) return "NOT_CLOCKED_IN";
    const todayIST = getTodayIST();
    if (record.date !== todayIST) return "NOT_CLOCKED_IN";
    if (record.clockIn != null && record.clockOut == null) return "CLOCKED_IN";
    if (record.clockIn != null && record.clockOut != null) return "COMPLETED";
    return "NOT_CLOCKED_IN";
}

function findTodayRecord(records: AttendanceRecord[]): AttendanceRecord | null {
    const todayIST = getTodayIST();
    return records.find((r) => r.date === todayIST) ?? null;
}

export function ClockWidget({ orgSlug, memberId }: Readonly<ClockWidgetProps>) {
    const { data: todayData, isLoading } = useQuery({
        queryKey: ["attendance-today", orgSlug, memberId],
        queryFn: () =>
            fetchMyAttendanceAction({
                orgSlug,
                memberId,
                filters: {
                    date_from: getTodayIST(),
                    date_to: getTodayIST(),
                    page: 1,
                    page_size: 1,
                },
            }),
        enabled: !!orgSlug && !!memberId,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const todayRecord = todayData
        ? findTodayRecord(todayData.items)
        : undefined;

    const [widgetState, setWidgetState] = useState<WidgetState>("LOADING");
    const [activeClockIn, setActiveClockIn] = useState<string | null>(null);
    const [completedRecord, setCompletedRecord] =
        useState<AttendanceRecord | null>(null);
    const [elapsedDisplay, setElapsedDisplay] = useState<string>("00:00:00");
    const [currentTime, setCurrentTime] = useState<string>("");
    const [inlineError, setInlineError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading) {
            setWidgetState("LOADING");
            return;
        }
        const derived = deriveWidgetState(todayRecord);
        setWidgetState(derived);

        if (derived === "CLOCKED_IN" && todayRecord?.clockIn) {
            setActiveClockIn(todayRecord.clockIn);
        } else if (derived === "COMPLETED" && todayRecord) {
            setActiveClockIn(null);
            setCompletedRecord(todayRecord);
        } else {
            setActiveClockIn(null);
        }
    }, [
        isLoading,
        todayRecord?.date,
        todayRecord?.clockIn,
        todayRecord?.clockOut,
    ]);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clockInMutation = useClockInMutation(orgSlug, memberId);
    const clockOutMutation = useClockOutMutation(orgSlug, memberId);

    // Elapsed timer for active session
    useEffect(() => {
        if (widgetState === "CLOCKED_IN" && activeClockIn) {
            setElapsedDisplay(formatElapsed(activeClockIn));
            intervalRef.current = setInterval(() => {
                setElapsedDisplay(formatElapsed(activeClockIn));
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [widgetState, activeClockIn]);

    // Current time ticking for not clocked in state
    useEffect(() => {
        if (widgetState === "NOT_CLOCKED_IN") {
            const updateTime = () => {
                const now = new Date();
                setCurrentTime(
                    now.toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    }),
                );
            };
            updateTime();
            timeIntervalRef.current = setInterval(updateTime, 1000);
        } else {
            if (timeIntervalRef.current) {
                clearInterval(timeIntervalRef.current);
                timeIntervalRef.current = null;
            }
        }
        return () => {
            if (timeIntervalRef.current) {
                clearInterval(timeIntervalRef.current);
                timeIntervalRef.current = null;
            }
        };
    }, [widgetState]);

    function handleClockIn() {
        setInlineError(null);
        clockInMutation
            .mutateAsync({})
            .then((record) => {
                setWidgetState("CLOCKED_IN");
                setActiveClockIn(record.clockIn);
                setElapsedDisplay("00:00:00");
                setInlineError(null);
            })
            .catch((err: unknown) => {
                let message = "Clock-in failed.";
                if (err instanceof Error) {
                    try {
                        message = (JSON.parse(err.message) as ApiError).message;
                    } catch {
                        message = err.message;
                    }
                }
                setInlineError(message);
            });
    }

    function handleClockOut() {
        setInlineError(null);
        clockOutMutation
            .mutateAsync({})
            .then((records) => {
                const todayIST = getTodayIST();
                const record =
                    records.find((r) => r.date === todayIST) ??
                    records[0] ??
                    null;
                setWidgetState("COMPLETED");
                setActiveClockIn(null);
                setCompletedRecord(record);
                setInlineError(null);
            })
            .catch((err: unknown) => {
                let message = "Clock-out failed.";
                if (err instanceof Error) {
                    try {
                        message = (JSON.parse(err.message) as ApiError).message;
                    } catch {
                        message = err.message;
                    }
                }
                setInlineError(message);
                if (message.includes("No active clock-in session found")) {
                    setWidgetState("NOT_CLOCKED_IN");
                    setActiveClockIn(null);
                }
            });
    }

    const todayLabel = formatTodayLabel();

    return (
        <div className="relative overflow-hidden bg-surface rounded-2xl border border-black/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

            <div className="relative p-6 md:p-8 flex flex-col items-center justify-center min-h-[240px]">
                <div className="absolute top-4 left-5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {todayLabel}
                </div>

                <AnimatePresence mode="wait">
                    {widgetState === "LOADING" && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                                duration: 0.4,
                                ease: [0.16, 1, 0.3, 1],
                            }}
                            className="flex flex-col items-center gap-6"
                        >
                            <div className="h-16 w-64 rounded-xl bg-neutral-100 animate-pulse" />
                            <div className="h-12 w-40 rounded-full bg-neutral-100 animate-pulse" />
                        </motion.div>
                    )}

                    {widgetState === "NOT_CLOCKED_IN" && (
                        <motion.div
                            key="not_clocked_in"
                            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
                            transition={{
                                type: "spring",
                                duration: 0.6,
                                bounce: 0,
                            }}
                            className="flex flex-col items-center gap-8 w-full"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-sm font-medium text-neutral-500">
                                    Ready to start your day?
                                </p>
                                <p className="font-mono text-5xl md:text-6xl font-medium tracking-tight text-neutral-300 tabular-nums">
                                    {currentTime || "00:00:00"}
                                </p>
                            </div>
                            <ClockInButton
                                onClockIn={handleClockIn}
                                isPending={clockInMutation.isPending}
                            />
                        </motion.div>
                    )}

                    {widgetState === "CLOCKED_IN" && (
                        <motion.div
                            key="clocked_in"
                            initial={{
                                opacity: 0,
                                scale: 0.9,
                                filter: "blur(4px)",
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                filter: "blur(0px)",
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.95,
                                filter: "blur(4px)",
                            }}
                            transition={{
                                type: "spring",
                                duration: 0.7,
                                bounce: 0,
                            }}
                            className="flex flex-col items-center gap-8 w-full"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1 bg-primary-ghost text-primary text-xs font-semibold uppercase tracking-wide rounded-full ring-1 ring-primary/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    Session Active
                                </div>
                                <p
                                    className="font-mono text-6xl md:text-7xl font-bold tracking-tighter text-neutral-900 tabular-nums"
                                    aria-live="polite"
                                    aria-label="Elapsed work time"
                                    style={{
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {elapsedDisplay}
                                </p>
                            </div>
                            <ClockOutButton
                                onClockOut={handleClockOut}
                                isPending={clockOutMutation.isPending}
                            />
                        </motion.div>
                    )}

                    {widgetState === "COMPLETED" && completedRecord && (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
                            transition={{
                                type: "spring",
                                duration: 0.6,
                                bounce: 0,
                            }}
                            className="flex flex-col items-center gap-8 w-full max-w-lg"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex items-center justify-center size-12 rounded-full bg-success-bg text-success-text mb-2">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-neutral-900">
                                    Day Complete
                                </h3>
                                <p className="text-neutral-500 text-center text-sm max-w-xs">
                                    You&apos;ve successfully logged your hours
                                    for today. Great job!
                                </p>
                            </div>

                            <div className="grid grid-cols-3 w-full gap-4 p-5 rounded-xl bg-canvas border border-neutral-100">
                                <div className="flex flex-col items-center">
                                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                                        Clock In
                                    </p>
                                    <p className="font-mono text-base font-semibold text-neutral-900">
                                        {formatTime(completedRecord.clockIn)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center border-x border-neutral-200">
                                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                                        Clock Out
                                    </p>
                                    <p className="font-mono text-base font-semibold text-neutral-900">
                                        {formatTime(completedRecord.clockOut)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                                        Worked
                                    </p>
                                    <p className="font-mono text-base font-semibold text-primary">
                                        {formatWorkedDuration(
                                            completedRecord.totalHours,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {inlineError && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-6 px-4 py-2 bg-destructive-bg text-destructive-text text-sm font-medium rounded-lg"
                        role="alert"
                    >
                        {inlineError}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
