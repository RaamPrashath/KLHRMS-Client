"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  House,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ClockInButton } from "@/modules/attendance/components/ClockInButton";
import { ClockOutConfirmDialog } from "@/modules/attendance/components/ClockOutConfirmDialog";
import { ClockOutButton } from "@/modules/attendance/components/ClockOutButton";
import { ProjectTaskSelector } from "@/modules/attendance/components/ProjectTaskSelector";
import {
  findTodayRecord,
  useAttendanceClockContextQuery,
  useAttendanceTodayQuery,
  useMemberProfileQuery,
} from "@/modules/attendance/hooks/queries/attendance";
import {
  useClockInMutation,
  useClockOutMutation,
} from "@/modules/attendance/hooks/mutations/attendance";
import { useProjectsForAttendance } from "@/modules/projects/hooks/useProjectsForAttendance";
import type {
  ApiError,
  AttendanceClockContext,
  AttendanceRecord,
  AttendanceWorkLocation,
} from "@/modules/attendance/types/attendanceTypes";
import {
  formatElapsed,
  formatWorkedDuration,
  formatTodayLabel,
  getTodayIST,
} from "@/modules/attendance/utils/attendanceFormatters";

type WidgetState = "LOADING" | "NOT_CLOCKED_IN" | "CLOCKED_IN" | "COMPLETED";
type ClockChoice = AttendanceWorkLocation;
type PlanLocation = AttendanceClockContext["plannedLocation"];

interface AttendanceClockCardProps {
  orgSlug: string;
  memberId: string;
  variant?: "attendance" | "dashboard";
  roleName?: string | null;
}

interface GeoState {
  status: "idle" | "loading" | "ready" | "error";
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  message: string | null;
}

interface LocationOptionCardProps {
  value: ClockChoice;
  selectedValue: ClockChoice;
  detectedValue: ClockChoice | null;
  disabled?: boolean;
  title: string;
  icon: typeof Building2;
  accentClassName: string;
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

function getGreeting(name: string) {
  const hour = new Date().getHours();

  const quotes: Record<string, string[]> = {
    early: [
      "The world is quiet and the day is yours, {name}.",
      "A fresh start. Take it easy, {name}.",
      "Peaceful morning, focused mind, {name}.",
      "The best ideas start in the quiet, {name}.",
      "Watching the sunrise with you, {name}.",
    ],
    morning: [
      "Coffee poured, goals set. Let's build, {name}.",
      "Wishing you deep focus and flow, {name}.",
      "Ready to make an impact today, {name}?",
      "Big goals, small steps. You've got this, {name}.",
      "Bringing the energy to a new day, {name}.",
    ],
    afternoon: [
      "Halfway there! Take a breather, {name}.",
      "Keep that momentum going, {name}.",
      "Drink some water and keep shining, {name}.",
      "Steady progress wins the day, {name}.",
      "Hope you're finding your flow, {name}.",
    ],
    evening: [
      "The sun is setting on a job well done, {name}.",
      "Time to wrap up and log off, {name}.",
      "Transitioning into rest mode, {name}.",
      "You put in solid work today, {name}.",
      "Almost time to recharge, {name}.",
    ],
    night: [
      "Still here? Don't forget to disconnect, {name}.",
      "The stars are out. Prioritize your rest, {name}.",
      "The work will be here tomorrow, {name}.",
      "Pace yourself, late-night legend, {name}.",
      "Peace of mind is the priority now, {name}.",
    ],
    midnight: [
      "Your most important task now is sleep, {name}.",
      "Past midnight? Go get some rest, {name}.",
      "The servers are sleeping—you should too, {name}.",
      "Take care of yourself first, {name}.",
      "Wishing you a restful night, {name}.",
    ],
  };

  let bucket: string[];
  if (hour < 5) bucket = quotes.midnight;
  else if (hour < 7) bucket = quotes.early;
  else if (hour < 12) bucket = quotes.morning;
  else if (hour < 17) bucket = quotes.afternoon;
  else if (hour < 20) bucket = quotes.evening;
  else bucket = quotes.night;

  const pick = bucket[Math.floor(Math.random() * bucket.length)] ?? bucket[0];
  return pick.replace("{name}", name);
}

function getDashboardClockStatus(widgetState: WidgetState): string {
  if (widgetState === "CLOCKED_IN") return "Clocked in";
  if (widgetState === "COMPLETED") return "Done for today";
  if (widgetState === "LOADING") return "Checking status";
  return "Not clocked in";
}

function mapPlanLocationToChoice(planLocation: PlanLocation): ClockChoice | null {
  if (planLocation === "OFFICE") return "OFFICE";
  if (planLocation === "WFH") return "REMOTE";
  return null;
}

function getPlanLabel(planLocation: PlanLocation): string {
  if (planLocation === "OFFICE") return "Office";
  if (planLocation === "WFH") return "Remote";
  if (planLocation === "LEAVE") return "Leave";
  if (planLocation === "HOLIDAY") return "Holiday";
  return "No plan";
}

function getLocationChoiceLabel(location: ClockChoice | null | undefined): string {
  if (location === "OFFICE") return "Office";
  if (location === "REMOTE") return "Remote";
  return "Unknown";
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMeters = 6_371_000;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const latA = toRadians(latitudeA);
  const latB = toRadians(latitudeB);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLongitude / 2) ** 2;
  const arc = 2 * Math.asin(Math.sqrt(haversine));
  return earthRadiusMeters * arc;
}

function getDetectedLocation(
  geoState: GeoState,
  context: AttendanceClockContext | undefined,
) {
  if (
    geoState.status !== "ready" ||
    geoState.latitude == null ||
    geoState.longitude == null ||
    !context?.office
  ) {
    return null;
  }

  const distanceMeters = getDistanceMeters(
    geoState.latitude,
    geoState.longitude,
    context.office.latitude,
    context.office.longitude,
  );
  return distanceMeters <= context.office.radiusMeters ? "OFFICE" : "REMOTE";
}

function parseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    try {
      return (JSON.parse(error.message) as ApiError).message;
    } catch {
      return error.message;
    }
  }
  return fallback;
}

function getDialogStatusMessage(args: {
  isClockContextLoading: boolean;
  geoState: GeoState;
  hasOffice: boolean;
  planBlocksClockIn: boolean;
  planMatchesSelection: boolean;
  locationMatchesSelection: boolean;
}): { tone: "muted" | "warning" | "success"; message: string } {
  const {
    isClockContextLoading,
    geoState,
    hasOffice,
    planBlocksClockIn,
    planMatchesSelection,
    locationMatchesSelection,
  } = args;

  if (isClockContextLoading) {
    return { tone: "muted", message: "Loading office and plan details..." };
  }

  if (!hasOffice) {
    return {
      tone: "warning",
      message: "Office coordinates are not configured for this organization yet.",
    };
  }

  if (geoState.status === "idle" || geoState.status === "loading") {
    return { tone: "muted", message: "Checking your live location..." };
  }

  if (geoState.status === "error") {
    return {
      tone: "warning",
      message: geoState.message ?? "We could not read your current location.",
    };
  }

  if (planBlocksClockIn) {
    return {
      tone: "warning",
      message: "Today's weekly plan blocks clock-in for this day.",
    };
  }

  if (!locationMatchesSelection) {
    return {
      tone: "warning",
      message: "Select the detected location to continue.",
    };
  }

  if (!planMatchesSelection) {
    return {
      tone: "warning",
      message: "Your detected location differs from today's weekly plan. Clock-in will use your detected location.",
    };
  }

  return {
    tone: "success",
    message: "Location verified. You can clock in now.",
  };
}

function LocationOptionCard({
  value,
  selectedValue,
  detectedValue,
  disabled = false,
  title,
  icon: Icon,
  accentClassName,
}: Readonly<LocationOptionCardProps>) {
  const isSelected = selectedValue === value;
  const isDetected = detectedValue === value;

  return (
    <label
      className={[
        "relative flex w-full cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all duration-200",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-neutral-300 hover:bg-neutral-50/70",
        isSelected
          ? "border-neutral-900 bg-neutral-50 text-foreground shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
          : "border-border bg-white text-foreground",
      ].join(" ")}
    >
      <RadioGroupItem value={value} className="border-current text-current" disabled={disabled} />
      <div className="flex items-center gap-2">
        <div
          className={[
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            isSelected ? `bg-neutral-100 ${accentClassName}` : `bg-neutral-100 ${accentClassName}`,
          ].join(" ")}
        >
          <Icon className="size-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {isDetected ? (
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                "bg-emerald-100 text-emerald-700",
              ].join(" ")}
            >
              Detected
            </span>
          ) : null}
        </div>
      </div>
    </label>
  );
}

export function AttendanceClockCard({
  orgSlug,
  memberId,
  variant = "attendance",
  roleName = null,
}: Readonly<AttendanceClockCardProps>) {
  const todayIso = getTodayIST();
  const isDashboard = variant === "dashboard";
  const [widgetState, setWidgetState] = useState<WidgetState>("LOADING");
  const [activeClockIn, setActiveClockIn] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<AttendanceRecord | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState("00:00:00");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClockOutDialogOpen, setIsClockOutDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ClockChoice>("OFFICE");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [clockInDescription, setClockInDescription] = useState("");
  const [clockOutWorkLogText, setClockOutWorkLogText] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [clockInFieldErrors, setClockInFieldErrors] = useState<{
    project?: string;
    task?: string;
  }>({});
  const [geoState, setGeoState] = useState<GeoState>({
    status: "idle",
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    message: null,
  });
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: todayData,
    isLoading,
    refetch: refetchTodayAttendance,
  } = useAttendanceTodayQuery(orgSlug, memberId, todayIso);
  const { data: profile } = useMemberProfileQuery(memberId);
  const { data: clockContext, isLoading: isClockContextLoading } =
    useAttendanceClockContextQuery(orgSlug, memberId, todayIso);
  const { data: projects = [] } = useProjectsForAttendance(orgSlug, memberId);

  const clockInMutation = useClockInMutation(orgSlug, memberId);
  const clockOutMutation = useClockOutMutation(orgSlug, memberId);

  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const greeting = useMemo(() => getGreeting(firstName), [firstName]);
  const todayRecord = todayData ? findTodayRecord(todayData.items) : undefined;
  const planChoice = mapPlanLocationToChoice(clockContext?.plannedLocation ?? null);
  const detectedLocation = getDetectedLocation(geoState, clockContext);
  const planBlocksClockIn =
    clockContext?.plannedLocation === "LEAVE" || clockContext?.plannedLocation === "HOLIDAY";
  const locationMatchesSelection =
    selectedLocation === detectedLocation && detectedLocation != null;
  const planMatchesSelection = !planChoice || selectedLocation === planChoice;
  const canSubmitClockIn =
    !planBlocksClockIn &&
    geoState.status === "ready" &&
    !!clockContext?.office &&
    locationMatchesSelection &&
    !!selectedProjectId &&
    !!selectedTaskId &&
    !clockInMutation.isPending;

  function requestCurrentLocation() {
    if (!clockContext?.office) {
      setGeoState({
        status: "error",
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        message: "Office coordinates are not configured for this organization yet.",
      });
      return;
    }

    if (!navigator.geolocation) {
      setGeoState({
        status: "error",
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        message: "Geolocation is not available in this browser.",
      });
      return;
    }

    setGeoState({
      status: "loading",
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      message: null,
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextGeoState: GeoState = {
          status: "ready",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? null,
          message: null,
        };
        setGeoState(nextGeoState);

        const nextDetected = getDetectedLocation(nextGeoState, clockContext);
        if (nextDetected) {
          setSelectedLocation(nextDetected);
        }
      },
      (error) => {
        setGeoState({
          status: "error",
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          message: error.message || "Unable to read your current location.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      },
    );
  }

  useEffect(() => {
    if (isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWidgetState("LOADING");
      return;
    }

    const derivedState = deriveWidgetState(todayRecord);
    setWidgetState(derivedState);

    if (derivedState === "CLOCKED_IN" && todayRecord?.clockIn) {
      setActiveClockIn(todayRecord.clockIn);
      setCompletedRecord(null);
      return;
    }

    if (derivedState === "COMPLETED" && todayRecord) {
      setActiveClockIn(null);
      setCompletedRecord(todayRecord);
      return;
    }

    setActiveClockIn(null);
    setCompletedRecord(null);
  }, [isLoading, todayRecord]);

  useEffect(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    if (widgetState === "CLOCKED_IN" && activeClockIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsedDisplay(formatElapsed(activeClockIn));
    }

    if (!isDashboard && (widgetState !== "CLOCKED_IN" || !activeClockIn)) {
      return;
    }

    elapsedIntervalRef.current = setInterval(() => {
      if (widgetState === "CLOCKED_IN" && activeClockIn) {
        setElapsedDisplay(formatElapsed(activeClockIn));
      }
    }, 1000);

    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    };
  }, [activeClockIn, isDashboard, widgetState]);

  function handleOpenClockInDialog() {
    setInlineError(null);
    setSelectedLocation(planChoice ?? "OFFICE");
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setClockInDescription("");
    setClockInFieldErrors({});
    requestCurrentLocation();
    setIsDialogOpen(true);
  }

  function handleClockInSubmit() {
    const nextErrors: { project?: string; task?: string } = {};

    if (!selectedProjectId) nextErrors.project = "Project is required";
    if (!selectedTaskId) nextErrors.task = "Task is required";

    if (Object.keys(nextErrors).length > 0) {
      setClockInFieldErrors(nextErrors);
      return;
    }

    if (!canSubmitClockIn || geoState.latitude == null || geoState.longitude == null) {
      return;
    }

    setInlineError(null);
    clockInMutation
      .mutateAsync({
        work_location: selectedLocation,
        latitude: geoState.latitude,
        longitude: geoState.longitude,
        accuracy_meters: geoState.accuracyMeters ?? undefined,
        project_id: selectedProjectId!,
        project_task_id: selectedTaskId!,
        description: clockInDescription.trim() || undefined,
      })
      .then((record) => {
        if (!record?.clockIn) {
          setInlineError("Clock-in was saved, but the active session could not be loaded. Refreshing attendance...");
          void refetchTodayAttendance();
          return;
        }
        setWidgetState("CLOCKED_IN");
        setActiveClockIn(record.clockIn);
        setCompletedRecord(null);
        setElapsedDisplay("00:00:00");
        setIsDialogOpen(false);
        void refetchTodayAttendance();
      })
      .catch((error: unknown) => {
        setInlineError(parseErrorMessage(error, "Clock-in failed."));
      });
  }

  function handleOpenClockOutDialog() {
    setInlineError(null);
    setClockOutWorkLogText("");
    setIsClockOutDialogOpen(true);
  }

  function handleClockOutConfirm() {
    const trimmedWorkLog = clockOutWorkLogText.trim();

    setInlineError(null);
    clockOutMutation
      .mutateAsync({ work_log_text: trimmedWorkLog })
      .then((records) => {
        const record = records.find((item) => item.date === todayIso) ?? records[0] ?? null;
        setWidgetState("COMPLETED");
        setActiveClockIn(null);
        setCompletedRecord(record);
        setClockOutWorkLogText("");
        setIsClockOutDialogOpen(false);
        void refetchTodayAttendance();
      })
      .catch((error: unknown) => {
        const message = parseErrorMessage(error, "Clock-out failed.");
        setInlineError(message);
        if (message.includes("No active clock-in session found")) {
          setWidgetState("NOT_CLOCKED_IN");
          setActiveClockIn(null);
          setCompletedRecord(null);
          void refetchTodayAttendance();
        }
      });
  }

  const todayLabel = formatTodayLabel();
  const statusLabel = getDashboardClockStatus(widgetState);
  const subtitle = roleName ? `${roleName} · ${statusLabel}` : statusLabel;
  const dialogStatus = getDialogStatusMessage({
    isClockContextLoading,
    geoState,
    hasOffice: !!clockContext?.office,
    planBlocksClockIn,
    planMatchesSelection,
    locationMatchesSelection,
  });
  const clockInButtonLabel =
    clockInMutation.isPending
      ? "Clocking in..."
      : geoState.status === "loading" || isClockContextLoading
        ? "Checking location..."
        : `Clock In as ${getLocationChoiceLabel(selectedLocation)}`;

  return (
    <>
      <div
        className={[
          "relative overflow-hidden",
          isDashboard
            ? "flex w-full h-full bg-transparent shadow-none border-none flex-col"
            : "rounded-2xl bg-white border border-zinc-200/80 dark:border-zinc-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-[#0A0A0C]",
        ].join(" ")}
      >
        <div
          className={[
            "relative flex min-h-25 justify-between gap-6",
            isDashboard
              ? "flex-1 flex-col gap-4 p-0 text-left md:flex-row md:items-center md:justify-between"
              : "p-6 md:p-8 flex-col md:flex-row md:items-center md:gap-0",
          ].join(" ")}
        >
          <div className={isDashboard ? "flex min-w-0 flex-1 flex-col text-left" : "flex min-w-0 flex-col text-left"}>
            {widgetState === "LOADING" ? (
              <>
                {isDashboard ? (
                  <>
                    <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
                    <div className="mt-2 h-4 w-72 animate-pulse rounded-lg bg-white/10" />
                  </>
                ) : (
                  <>
                    <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-100" />
                    <div className="mt-2 h-4 w-32 animate-pulse rounded-lg bg-neutral-100" />
                  </>
                )}
              </>
            ) : (
              <>
                {isDashboard ? (
                  <>
                    <div className="min-w-0">
                      <h2 className="max-w-136 text-balance font-sans text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white" title={greeting}>
                        {greeting}
                      </h2>
                      <p className="mt-2 text-[1.02rem] text-white/72">{subtitle}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="truncate font-sans text-xl font-medium text-neutral-900" title={greeting}>
                      {greeting}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-400">{todayLabel}</p>
                    {clockContext?.plannedLocation ? (
                      <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                        Planned: {getPlanLabel(clockContext.plannedLocation)}
                      </p>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>

          <div className={isDashboard ? "flex shrink-0 items-center justify-end" : "flex items-center shrink-0 min-h-[48px]"}>
            <AnimatePresence mode="wait">
              {widgetState === "LOADING" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={isDashboard ? "h-12 w-40 animate-pulse rounded-xl bg-white/10" : "h-12 w-32 animate-pulse rounded-xl bg-neutral-100"}
                />
              )}

              {widgetState === "NOT_CLOCKED_IN" && (
                <motion.div
                  key="not-clocked-in"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.25 }}
                >
                  <div className={isDashboard ? "" : ""}>
                    <ClockInButton
                      onClockIn={handleOpenClockInDialog}
                      isPending={clockInMutation.isPending || isClockContextLoading}
                    />
                  </div>
                </motion.div>
              )}

              {widgetState === "CLOCKED_IN" && (
                <motion.div
                  key="clocked-in"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.25 }}
                  className={isDashboard ? "flex items-center gap-4" : "flex items-center gap-6"}
                >
                  {isDashboard ? (
                    <div className="flex items-center gap-3">
                      <p
                        className="text-[2.25rem] font-light tracking-tight text-white tabular-nums"
                        aria-live="polite"
                      >
                        {elapsedDisplay}
                      </p>
                      <span className="inline-flex size-3 rounded-full bg-[#2fb56f]" />
                    </div>
                  ) : null}
                  {!isDashboard ? (
                    <div className="flex items-center gap-3">
                      <p
                        className="font-sans text-3xl font-light tracking-tight text-neutral-900 tabular-nums"
                        aria-live="polite"
                      >
                        {elapsedDisplay}
                      </p>
                      <div className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00874A] opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00874A]" />
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <ClockOutButton
                      onClockOut={handleOpenClockOutDialog}
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
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-4"
                >
                  <div className={isDashboard ? "rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white/70" : "rounded-xl bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-500"}>
                    Day complete - {formatWorkedDuration(completedRecord.totalHours)} logged
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {inlineError ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-10 rounded-lg bg-destructive-bg px-4 py-2 text-sm font-medium text-destructive-text"
              role="alert"
            >
              {inlineError}
            </motion.div>
          ) : null}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-center">Confirm clock-in location</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div
              className={[
                "rounded-2xl border px-4 py-3 text-sm text-center",
                dialogStatus.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : dialogStatus.tone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-border bg-muted/25 text-muted-foreground",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-left">
                  {dialogStatus.tone === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : dialogStatus.tone === "warning" ? (
                    <AlertCircle className="size-4 shrink-0" />
                  ) : (
                    <Loader2
                      className={[
                        "size-4 shrink-0",
                        geoState.status === "loading" || isClockContextLoading ? "animate-spin" : "",
                      ].join(" ")}
                    />
                  )}
                  <p className="min-w-0 font-medium">{dialogStatus.message}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3"
                  onClick={requestCurrentLocation}
                  disabled={geoState.status === "loading" || isClockContextLoading || clockInMutation.isPending}
                >
                  <RefreshCcw className="mr-2 size-3.5" />
                  Refresh
                </Button>
              </div>
            </div>

            <RadioGroup
              value={selectedLocation}
              onValueChange={(value) => setSelectedLocation(value as ClockChoice)}
              className="grid grid-cols-2 gap-3"
            >
              <LocationOptionCard
                value="OFFICE"
                selectedValue={selectedLocation}
                detectedValue={detectedLocation}
                disabled={geoState.status === "loading" || isClockContextLoading}
                title="Office"
                icon={Building2}
                accentClassName="text-emerald-600"
              />
              <LocationOptionCard
                value="REMOTE"
                selectedValue={selectedLocation}
                detectedValue={detectedLocation}
                disabled={geoState.status === "loading" || isClockContextLoading}
                title="Remote"
                icon={House}
                accentClassName="text-sky-600"
              />
            </RadioGroup>

            <ProjectTaskSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedTaskId={selectedTaskId}
              onProjectChange={(value) => {
                setSelectedProjectId(value);
                if (value) {
                  setClockInFieldErrors((current) => ({ ...current, project: undefined }));
                }
              }}
              onTaskChange={(value) => {
                setSelectedTaskId(value);
                if (value) {
                  setClockInFieldErrors((current) => ({ ...current, task: undefined }));
                }
              }}
              projectError={clockInFieldErrors.project}
              taskError={clockInFieldErrors.task}
              disabled={clockInMutation.isPending}
            />

            <div className="space-y-1.5">
              <label htmlFor="clock-in-description" className="text-[14px] font-semibold text-ink-muted-48">
                Description
              </label>
              <Textarea
                id="clock-in-description"
                ref={descriptionRef}
                value={clockInDescription}
                onChange={(event) => {
                  setClockInDescription(event.target.value);
                  const el = event.target;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                }}
                placeholder="Additional details..."
                className="resize-none border-hairline bg-canvas/30 text-sm text-ink placeholder:text-ink-muted-48/50 min-h-[72px] max-h-[160px] overflow-y-auto"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClockInSubmit} disabled={!canSubmitClockIn}>
              {clockInButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClockOutConfirmDialog
        open={isClockOutDialogOpen}
        activeClockIn={activeClockIn}
        elapsedDisplay={elapsedDisplay}
        workLogText={clockOutWorkLogText}
        isPending={clockOutMutation.isPending}
        error={inlineError}
        onOpenChange={(open) => {
          setIsClockOutDialogOpen(open);
          if (!open) setInlineError(null);
        }}
        onWorkLogChange={setClockOutWorkLogText}
        onConfirm={handleClockOutConfirm}
      />
    </>
  );
}

