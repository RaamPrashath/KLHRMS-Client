"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  House,
  Loader2,
  MapPin,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  fetchAttendanceClockContextAction,
  fetchMemberProfileAction,
  fetchMyAttendanceAction,
} from "@/modules/attendance/api/attendanceServerActions";
import { ClockInButton } from "@/modules/attendance/components/ClockInButton";
import { ClockOutButton } from "@/modules/attendance/components/ClockOutButton";
import { useClockInMutation } from "@/modules/attendance/hooks/useClockInMutation";
import { useClockOutMutation } from "@/modules/attendance/hooks/useClockOutMutation";
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
  description: string;
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

function findTodayRecord(records: AttendanceRecord[]): AttendanceRecord | null {
  const todayIST = getTodayIST();
  return records.find((record) => record.date === todayIST) ?? null;
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const greetings =
    hour < 6
      ? "Early start, {name}."
      : hour < 12
        ? "Good morning, {name}."
        : hour < 17
          ? "Good afternoon, {name}."
          : hour < 21
            ? "Good evening, {name}."
            : "Still going strong, {name}.";
  return greetings.replace("{name}", name);
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
): { location: ClockChoice | null; distanceMeters: number | null } {
  if (
    geoState.status !== "ready" ||
    geoState.latitude == null ||
    geoState.longitude == null ||
    !context?.office
  ) {
    return { location: null, distanceMeters: null };
  }

  const distanceMeters = getDistanceMeters(
    geoState.latitude,
    geoState.longitude,
    context.office.latitude,
    context.office.longitude,
  );
  const location =
    distanceMeters <= context.office.radiusMeters ? "OFFICE" : "REMOTE";
  return { location, distanceMeters: Math.round(distanceMeters) };
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
      message: "Your detected location does not match today's weekly plan.",
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
  description,
  icon: Icon,
  accentClassName,
}: Readonly<LocationOptionCardProps>) {
  const isSelected = selectedValue === value;
  const isDetected = detectedValue === value;

  return (
    <label
      className={[
        "relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all duration-200",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-neutral-300 hover:bg-neutral-50/70",
        isSelected
          ? "border-neutral-900 bg-neutral-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
          : "border-border bg-white text-foreground",
      ].join(" ")}
    >
      <RadioGroupItem value={value} className="mt-1 border-current text-current" disabled={disabled} />
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className={[
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              isSelected ? "bg-white/12 text-white" : `bg-neutral-100 ${accentClassName}`,
            ].join(" ")}
          >
            <Icon className="size-4" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {isDetected ? (
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                  isSelected ? "bg-white/12 text-white" : "bg-emerald-100 text-emerald-700",
                ].join(" ")}
              >
                Detected
              </span>
            ) : null}
          </div>
        </div>
        <p className={["text-xs leading-5", isSelected ? "text-white/75" : "text-muted-foreground"].join(" ")}>
          {description}
        </p>
      </div>
    </label>
  );
}

export function AttendanceClockCard({
  orgSlug,
  memberId,
  variant = "attendance",
}: Readonly<AttendanceClockCardProps>) {
  const todayIso = getTodayIST();
  const [widgetState, setWidgetState] = useState<WidgetState>("LOADING");
  const [activeClockIn, setActiveClockIn] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<AttendanceRecord | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState("00:00:00");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ClockChoice>("OFFICE");
  const [geoState, setGeoState] = useState<GeoState>({
    status: "idle",
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    message: null,
  });
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: todayData, isLoading } = useQuery({
    queryKey: ["attendance-today", orgSlug, memberId],
    queryFn: () =>
      fetchMyAttendanceAction({
        orgSlug,
        memberId,
        filters: {
          date_from: todayIso,
          date_to: todayIso,
          page: 1,
          page_size: 1,
        },
      }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: profile } = useQuery({
    queryKey: ["member-profile", memberId],
    queryFn: () => fetchMemberProfileAction({ memberId }),
    enabled: !!memberId,
    staleTime: 300_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: clockContext, isLoading: isClockContextLoading } = useQuery({
    queryKey: ["attendance-clock-context", orgSlug, memberId, todayIso],
    queryFn: () =>
      fetchAttendanceClockContextAction({
        orgSlug,
        memberId,
        date: todayIso,
      }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 300_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

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
    selectedLocation === detectedLocation.location && detectedLocation.location != null;
  const planMatchesSelection = !planChoice || selectedLocation === planChoice;
  const canSubmitClockIn =
    !planBlocksClockIn &&
    geoState.status === "ready" &&
    !!clockContext?.office &&
    locationMatchesSelection &&
    planMatchesSelection &&
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
        if (nextDetected.location) {
          setSelectedLocation(nextDetected.location);
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
    if (widgetState !== "CLOCKED_IN" || !activeClockIn) {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      return;
    }

    setElapsedDisplay(formatElapsed(activeClockIn));
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedDisplay(formatElapsed(activeClockIn));
    }, 1000);

    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    };
  }, [activeClockIn, widgetState]);

  useEffect(() => {
    if (!isDialogOpen) return;
    setSelectedLocation(planChoice ?? "OFFICE");
    requestCurrentLocation();
  }, [clockContext?.office, isDialogOpen, planChoice]);

  function handleOpenClockInDialog() {
    setInlineError(null);
    setIsDialogOpen(true);
  }

  function handleClockInSubmit() {
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
      })
      .then((record) => {
        setWidgetState("CLOCKED_IN");
        setActiveClockIn(record.clockIn);
        setCompletedRecord(null);
        setElapsedDisplay("00:00:00");
        setIsDialogOpen(false);
      })
      .catch((error: unknown) => {
        setInlineError(parseErrorMessage(error, "Clock-in failed."));
      });
  }

  function handleClockOut() {
    setInlineError(null);
    clockOutMutation
      .mutateAsync({})
      .then((records) => {
        const record = records.find((item) => item.date === todayIso) ?? records[0] ?? null;
        setWidgetState("COMPLETED");
        setActiveClockIn(null);
        setCompletedRecord(record);
      })
      .catch((error: unknown) => {
        const message = parseErrorMessage(error, "Clock-out failed.");
        setInlineError(message);
        if (message.includes("No active clock-in session found")) {
          setWidgetState("NOT_CLOCKED_IN");
          setActiveClockIn(null);
        }
      });
  }

  const todayLabel = formatTodayLabel();
  const isDashboard = variant === "dashboard";
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
          "relative overflow-hidden rounded-2xl border-none bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
          isDashboard ? "flex h-full min-h-[240px] flex-col" : "",
        ].join(" ")}
      >
        <div
          className={[
            "relative flex min-h-[100px] justify-between gap-6 p-6 md:p-8",
            isDashboard ? "flex-1 flex-col" : "flex-col md:flex-row md:items-center md:gap-0",
          ].join(" ")}
        >
          <div className="flex min-w-0 flex-col text-left">
            {widgetState === "LOADING" ? (
              <>
                <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-100" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded-lg bg-neutral-100" />
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
          </div>

          <div className={isDashboard ? "flex items-center justify-center" : "flex items-center shrink-0 min-h-[48px]"}>
            <AnimatePresence mode="wait">
              {widgetState === "LOADING" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="h-12 w-32 animate-pulse rounded-xl bg-neutral-100"
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
                  <ClockInButton
                    onClockIn={handleOpenClockInDialog}
                    isPending={clockInMutation.isPending || isClockContextLoading}
                  />
                </motion.div>
              )}

              {widgetState === "CLOCKED_IN" && (
                <motion.div
                  key="clocked-in"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.25 }}
                  className={isDashboard ? "flex flex-col items-center gap-4" : "flex items-center gap-6"}
                >
                  <div className="flex items-center gap-3">
                    <p
                      className={[
                        "font-sans font-light tracking-tight text-neutral-900 tabular-nums",
                        isDashboard ? "text-4xl" : "text-3xl",
                      ].join(" ")}
                      aria-live="polite"
                    >
                      {elapsedDisplay}
                    </p>
                    <div className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00874A] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00874A]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-4"
                >
                  <div className="rounded-xl bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-500">
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
              className="absolute bottom-[-40px] rounded-lg bg-destructive-bg px-4 py-2 text-sm font-medium text-destructive-text"
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
            <DialogTitle>Confirm clock-in location</DialogTitle>
            <DialogDescription>
              Your location is checked automatically when this dialog opens. We use the organization office coordinates and today's weekly plan before enabling clock-in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div
              className={[
                "rounded-2xl border px-4 py-3 text-sm",
                dialogStatus.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : dialogStatus.tone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-border bg-muted/25 text-muted-foreground",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {dialogStatus.tone === "success" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  ) : dialogStatus.tone === "warning" ? (
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <Loader2
                      className={[
                        "mt-0.5 size-4 shrink-0",
                        geoState.status === "loading" || isClockContextLoading ? "animate-spin" : "",
                      ].join(" ")}
                    />
                  )}
                  <p className="font-medium">{dialogStatus.message}</p>
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
              className="grid gap-3 md:grid-cols-2"
            >
              <LocationOptionCard
                value="OFFICE"
                selectedValue={selectedLocation}
                detectedValue={detectedLocation.location}
                disabled={geoState.status === "loading" || isClockContextLoading}
                title="Office"
                description="Use this when your live coordinates fall inside the office geofence."
                icon={Building2}
                accentClassName="text-emerald-600"
              />
              <LocationOptionCard
                value="REMOTE"
                selectedValue={selectedLocation}
                detectedValue={detectedLocation.location}
                disabled={geoState.status === "loading" || isClockContextLoading}
                title="Remote"
                description="Use this when your live coordinates place you outside the office geofence."
                icon={House}
                accentClassName="text-sky-600"
              />
            </RadioGroup>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-primary" />
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Live location check</p>
                  {geoState.status === "loading" ? (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Reading your current coordinates...
                    </p>
                  ) : null}
                  {geoState.status === "error" ? (
                    <p className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="size-4" />
                      {geoState.message}
                    </p>
                  ) : null}
                  {geoState.status === "ready" ? (
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        Detected location:{" "}
                        <span className="font-semibold text-foreground">
                          {getLocationChoiceLabel(detectedLocation.location)}
                        </span>
                      </p>
                      {detectedLocation.distanceMeters != null ? (
                        <p>{detectedLocation.distanceMeters}m from office center</p>
                      ) : null}
                      {geoState.accuracyMeters != null ? (
                        <p>Accuracy +/-{Math.round(geoState.accuracyMeters)}m</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-4 text-sm">
              <p className="font-medium text-foreground">Plan alignment</p>
              <p className="mt-1 text-muted-foreground">
                Today's weekly plan:{" "}
                <span className="font-semibold text-foreground">
                  {getPlanLabel(clockContext?.plannedLocation ?? null)}
                </span>
              </p>
              {clockContext?.office ? (
                <p className="mt-1 text-muted-foreground">
                  Office geofence radius:{" "}
                  <span className="font-semibold text-foreground">
                    {clockContext.office.radiusMeters}m
                  </span>
                </p>
              ) : null}
              {!planMatchesSelection && !planBlocksClockIn ? (
                <p className="mt-2 flex items-center gap-2 text-amber-700">
                  <AlertCircle className="size-4" />
                  Your detected location and today's weekly plan do not match.
                </p>
              ) : null}
              {planBlocksClockIn ? (
                <p className="mt-2 flex items-center gap-2 text-amber-700">
                  <AlertCircle className="size-4" />
                  Today is marked as {getPlanLabel(clockContext?.plannedLocation ?? null)} in the weekly plan, so clock-in is blocked.
                </p>
              ) : null}
              {locationMatchesSelection && planMatchesSelection && !planBlocksClockIn ? (
                <p className="mt-2 flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                  Selection, coordinates, and weekly plan all match.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClockInSubmit} disabled={!canSubmitClockIn}>
              {clockInButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
