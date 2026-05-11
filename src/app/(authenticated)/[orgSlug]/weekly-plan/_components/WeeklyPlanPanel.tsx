"use client";

import { memo, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getMyWeeklyPlanQueryOptions,
  getPlanLocationsQueryOptions,
  useMyWeeklyPlanQuery,
  usePlanLocationsQuery,
} from "@/hooks/queries/weekly_plan";
import { useSaveWeeklyPlanMutation } from "@/hooks/mutations/weekly_plan";
import { useApiClient } from "@/hooks/useApiClient";
import { useMyAttendanceQuery } from "@/modules/attendance/hooks/queries/attendance";
import { getCurrentWeekState, getWeekDays, shiftWeek } from "@/modules/weekly-plan/date";
import type {
  PlanLocationOption,
  PlanLocationValue,
  WeeklyPlanDayInput,
  WeeklyPlanEntry,
} from "@/types/weekly_plan";
import { WeeklyPlanGrid } from "./WeeklyPlanGrid";
import { WeekNavigator } from "./WeekNavigator";
import type { DayDraft } from "./DayColumn";

interface WeeklyPlanPanelProps {
  orgSlug: string;
  orgId: string;
  memberId: string;
  userId: string;
  onDirtyChange: (isDirty: boolean) => void;
}

function buildDrafts(entries: WeeklyPlanEntry[]): Record<string, DayDraft> {
  return entries.reduce<Record<string, DayDraft>>((accumulator, entry) => {
    accumulator[entry.date] = {
      work_location: entry.work_location,
      project: entry.project ?? "",
    };
    return accumulator;
  }, {});
}

function draftsEqual(
  left: Record<string, DayDraft>,
  right: Record<string, DayDraft>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export const WeeklyPlanPanel = memo(function WeeklyPlanPanel({
  orgSlug,
  orgId,
  memberId,
  userId,
  onDirtyChange,
}: WeeklyPlanPanelProps) {
  const [weekState, setWeekState] = useState(getCurrentWeekState);
  const [baselineDrafts, setBaselineDrafts] = useState<Record<string, DayDraft>>({});
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();
  const auth = useApiClient(orgId);

  const { data: locations = [], isLoading: isLocationsLoading } = usePlanLocationsQuery(
    orgSlug,
    orgId,
    memberId,
  );
  const {
    data: myEntries = [],
    isLoading: isWeekLoading,
  } = useMyWeeklyPlanQuery(orgSlug, orgId, memberId, weekState.year, weekState.week);
  const weekDays = useMemo(
    () => getWeekDays(weekState.year, weekState.week),
    [weekState.week, weekState.year],
  );
  const attendanceQuery = useMyAttendanceQuery(orgSlug, memberId, {
    dateFrom: weekDays[0]?.iso,
    dateTo: weekDays[weekDays.length - 1]?.iso,
    page: 1,
    pageSize: 10,
  });

  const saveMutation = useSaveWeeklyPlanMutation(
    orgSlug,
    orgId,
    memberId,
    userId,
    weekState.year,
    weekState.week,
  );

  useEffect(() => {
    const nextBaseline = buildDrafts(myEntries);
    startTransition(() => {
      setBaselineDrafts(nextBaseline);
      setDrafts(nextBaseline);
      setIsDirty(false);
    });
  }, [myEntries, weekState.week, weekState.year]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!auth) return;

    const previous = shiftWeek(weekState.year, weekState.week, -1);
    const next = shiftWeek(weekState.year, weekState.week, 1);
    const planAuth = { token: auth.token, orgSlug, memberId };

    queryClient.prefetchQuery(
      getMyWeeklyPlanQueryOptions(planAuth, orgSlug, previous.year, previous.week),
    );
    queryClient.prefetchQuery(
      getMyWeeklyPlanQueryOptions(planAuth, orgSlug, next.year, next.week),
    );

    queryClient.prefetchQuery(getPlanLocationsQueryOptions(planAuth, orgSlug));
  }, [auth, memberId, orgSlug, queryClient, weekState.week, weekState.year]);

  const updateDraft = useCallback((date: string, nextDraft: DayDraft) => {
    setDrafts((current) => {
      const nextDrafts = { ...current, [date]: nextDraft };
      const nextDirty = !draftsEqual(nextDrafts, baselineDrafts);
      setIsDirty(nextDirty);
      return nextDrafts;
    });
  }, [baselineDrafts]);

  function maybeChangeWeek(delta: number) {
    if (
      isDirty &&
      !window.confirm("You have unsaved weekly changes. Move to another week anyway?")
    ) {
      return;
    }
    setWeekState((current) => shiftWeek(current.year, current.week, delta));
  }

  async function handleCopyPreviousWeek() {
    if (!auth) return;

    const previous = shiftWeek(weekState.year, weekState.week, -1);
    const previousEntries = await queryClient.fetchQuery(
      getMyWeeklyPlanQueryOptions(
        { token: auth.token, orgSlug, memberId },
        orgSlug,
        previous.year,
        previous.week,
      ),
    );

    if (!previousEntries.length) {
      toast.info("No previous week plan was found to copy.");
      return;
    }

    const nextDrafts = { ...drafts };
    const currentWeekDays = getWeekDays(weekState.year, weekState.week);
    const previousWeekDays = getWeekDays(previous.year, previous.week);

    currentWeekDays.forEach((currentDay, index) => {
      const previousDate = previousWeekDays[index]?.iso;
      const previousEntry = previousEntries.find((entry) => entry.date === previousDate);
      if (!previousEntry) return;

      nextDrafts[currentDay.iso] = {
        work_location: previousEntry.work_location,
        project: previousEntry.project ?? "",
      };
    });

    setDrafts(nextDrafts);
    setIsDirty(!draftsEqual(nextDrafts, baselineDrafts));
    toast.success("Previous week copied into the current draft.");
  }

  async function handleSave() {
    const payload: WeeklyPlanDayInput[] = getWeekDays(weekState.year, weekState.week).map(
      ({ iso }) => {
        const draft = drafts[iso] ?? { work_location: "", project: "" };
        return {
          date: iso,
          work_location: (draft.work_location || null) as PlanLocationValue | null,
          project: null, // Note field removed from UI, so we send null
        };
      },
    );

    try {
      const entries = await saveMutation.mutateAsync(payload);
      const nextBaseline = buildDrafts(entries);
      setBaselineDrafts(nextBaseline);
      setDrafts(nextBaseline);
      setIsDirty(false);
      toast.success("Weekly plan saved.");
    } catch {
      // Mutation handles the error toast.
    }
  }

  const resolvedLocations = locations as PlanLocationOption[];
  const actualByDate = useMemo(
    () =>
      Object.fromEntries(
        (attendanceQuery.data?.items ?? []).map((record) => [
          record.date,
          {
            hasClockIn: !!record.clockIn,
          },
        ]),
      ),
    [attendanceQuery.data?.items],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 pt-2">
        <div className="mb-1 flex flex-col gap-4 rounded-2xl border border-border bg-[#f5f5f7] p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground">My Plan</h2>
              <p className="text-[11px] font-medium text-muted-foreground/70">
                Update your location for each day and save once finished.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <WeekNavigator
                year={weekState.year}
                week={weekState.week}
                onPrevious={() => maybeChangeWeek(-1)}
                onNext={() => maybeChangeWeek(1)}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-border bg-white px-5 text-[11px] font-semibold uppercase tracking-wider text-foreground hover:bg-white"
                onClick={handleCopyPreviousWeek}
                disabled={isWeekLoading || isLocationsLoading || saveMutation.isPending}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy previous
              </Button>
            </div>
          </div>
        </div>

        <WeeklyPlanGrid
          year={weekState.year}
          week={weekState.week}
          entries={myEntries}
          drafts={drafts}
          locations={resolvedLocations}
          isLoading={isWeekLoading || isLocationsLoading || attendanceQuery.isLoading}
          isDirty={isDirty}
          isSaving={saveMutation.isPending}
          actualByDate={actualByDate}
          onDraftChange={updateDraft}
          onSave={handleSave}
        />
      </section>
    </div>
  );
});
