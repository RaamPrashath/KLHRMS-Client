"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useClockInMutation } from "@/modules/attendance/hooks/useClockInMutation";
import { useClockOutMutation } from "@/modules/attendance/hooks/useClockOutMutation";
import {
    formatElapsed,
    formatTime,
    formatWorkedDuration,
    formatTodayLabel,
    getTodayIST,
} from "@/modules/attendance/utils/attendanceFormatters";
import { 
    fetchMyAttendanceAction, 
    fetchMemberProfileAction 
} from "@/modules/attendance/api/attendanceServerActions";
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

const GREETINGS = {
    EARLY_MORNING: [
        "Early bird catches the worm, {name}! ☀️",
        "Rising and shining, {name}? 🌅",
        "Peaceful start to the day, {name}. ✨",
        "The world is quiet, let's make some noise, {name}! 🚀",
        "Fueling up for a big day, {name}? ☕"
    ],
    MORNING: [
        "Good morning, {name}! 👋",
        "Hope you have a productive morning, {name}! 📈",
        "Ready to crush those goals, {name}? 💪",
        "Wishing you a wonderful start, {name}! 🌸",
        "Let's make today count, {name}! ✨"
    ],
    AFTERNOON: [
        "Good afternoon, {name}! ☀️",
        "Keeping the momentum going, {name}? 🚀",
        "Hope your day is going great, {name}! ✨",
        "Time for a quick refresh, {name}? 🥤",
        "Still going strong, {name}! 💪"
    ],
    EVENING: [
        "Good evening, {name}! 🌆",
        "Wrapping up something exciting, {name}? ✨",
        "Sun's going down, but you're still shining, {name}! 🌟",
        "Great work today, {name}! 👏",
        "Hope you're having a relaxing evening, {name}! 🌙"
    ],
    NIGHT: [
        "Burning the midnight oil, {name}? 💡",
        "Still at it? You're a legend, {name}! 🌟",
        "Working late? Don't forget to rest soon, {name}. 🌙",
        "Quiet night, busy mind, {name}? ✨",
        "Making the most of every hour, {name}! 💪"
    ],
    LATE_NIGHT: [
        "Wait, it's late night, {name}! 🌙",
        "The stars are out and so are you, {name}! ✨",
        "Coding in the dark? Stay focused, {name}! 💻",
        "Is it tomorrow already, {name}? 🕰️",
        "True dedication right here, {name}! 🚀"
    ]
} as const;

function getGreeting(name: string) {
    const hour = new Date().getHours();
    let category: keyof typeof GREETINGS;

    if (hour >= 4 && hour < 6) category = "EARLY_MORNING";
    else if (hour >= 6 && hour < 12) category = "MORNING";
    else if (hour >= 12 && hour < 17) category = "AFTERNOON";
    else if (hour >= 17 && hour < 21) category = "EVENING";
    else if (hour >= 21 && hour < 24) category = "NIGHT";
    else category = "LATE_NIGHT";

    const quotes = GREETINGS[category];
    const quote = quotes[Math.floor(Math.random() * quotes.length)]!;
    return quote.replace("{name}", name);
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

    const { data: profile } = useQuery({
        queryKey: ["member-profile", memberId],
        queryFn: () => fetchMemberProfileAction({ memberId }),
        enabled: !!memberId,
    });

    const firstName = profile?.name?.split(" ")[0] ?? "there";
    const greeting = useMemo(() => getGreeting(firstName), [firstName]);

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
        <div className="relative overflow-hidden bg-white rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 min-h-[100px]">
                <div className="flex flex-col text-left w-full md:w-auto min-w-0">
                    {widgetState === "LOADING" ? (
                        <>
                            <div className="h-7 w-48 bg-neutral-100 animate-pulse rounded-lg" />
                            <div className="h-4 w-32 bg-neutral-100 animate-pulse rounded-lg mt-2" />
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-medium font-sans text-neutral-900 truncate" title={greeting}>
                                {greeting}
                            </h2>
                            <p className="text-neutral-400 text-sm mt-1">{todayLabel}</p>
                        </>
                    )}
                </div>

                <div className="flex items-center shrink-0 min-h-[48px]">
                    <AnimatePresence mode="wait">
                        {widgetState === "LOADING" && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="h-12 w-32 rounded-xl bg-neutral-100 animate-pulse"
                            />
                        )}

                        {widgetState === "NOT_CLOCKED_IN" && (
                            <motion.div
                                key="not_clocked_in"
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)" }}
                                transition={{ duration: 0.4 }}
                            >
                                <ClockInButton
                                    onClockIn={handleClockIn}
                                    isPending={clockInMutation.isPending}
                                />
                            </motion.div>
                        )}

                        {widgetState === "CLOCKED_IN" && (
                            <motion.div
                                key="clocked_in"
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)" }}
                                transition={{ duration: 0.4 }}
                                className="flex items-center gap-6"
                            >
                                <div className="flex items-center gap-3">
                                    <p
                                        className="font-sans text-3xl font-light tracking-tight text-neutral-900 tabular-nums"
                                        aria-live="polite"
                                    >
                                        {elapsedDisplay}
                                    </p>
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00874A] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00874A]"></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="px-5 py-3 text-sm font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-xl transition-colors">
                                        Take a Break
                                    </button>
                                    <ClockOutButton
                                        onClockOut={handleClockOut}
                                        isPending={clockOutMutation.isPending}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {widgetState === "COMPLETED" && completedRecord && (
                            <motion.div
                                key="completed"
                                initial={{ opacity: 0, filter: "blur(4px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, filter: "blur(4px)" }}
                                transition={{ duration: 0.4 }}
                                className="flex items-center gap-4"
                            >
                                <div className="px-6 py-3 rounded-xl bg-neutral-100 text-neutral-500 text-sm font-medium">
                                    Day Complete • {formatWorkedDuration(completedRecord.totalHours)} logged
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {inlineError && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-[-40px] px-4 py-2 bg-destructive-bg text-destructive-text text-sm font-medium rounded-lg"
                        role="alert"
                    >
                        {inlineError}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
