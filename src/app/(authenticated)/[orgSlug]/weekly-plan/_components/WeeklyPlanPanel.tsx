"use client";

import { memo, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Save, User, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getMyWeeklyPlanQueryOptions,
  getPlanLocationsQueryOptions,
  getTeamWeeklyPlanQueryOptions,
  useMyWeeklyPlanQuery,
  usePlanLocationsQuery,
  useTeamWeeklyPlanQuery,
} from "@/hooks/queries/weekly_plan";
import { useSaveWeeklyPlanMutation } from "@/hooks/mutations/weekly_plan";
import { useApiClient } from "@/hooks/useApiClient";
import { useMyAttendanceQuery } from "@/modules/attendance/hooks/useMyAttendanceQuery";
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
  canViewTeam: boolean;
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

function groupTeamEntries(entries: WeeklyPlanEntry[]) {
  return entries.reduce<Record<string, { name: string | null; entries: WeeklyPlanEntry[] }>>(
    (accumulator, entry) => {
      if (!accumulator[entry.user_id]) {
        accumulator[entry.user_id] = { name: entry.user_name, entries: [] };
      }
      accumulator[entry.user_id].entries.push(entry);
      return accumulator;
    },
    {},
  );
}

export const WeeklyPlanPanel = memo(function WeeklyPlanPanel({
  orgSlug,
  orgId,
  memberId,
  userId,
  canViewTeam,
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
  const teamQuery = useTeamWeeklyPlanQuery(
    orgSlug,
    orgId,
    memberId,
    weekState.year,
    weekState.week,
    canViewTeam,
  );
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

    if (canViewTeam) {
      queryClient.prefetchQuery(
        getTeamWeeklyPlanQueryOptions(planAuth, orgSlug, previous.year, previous.week),
      );
      queryClient.prefetchQuery(
        getTeamWeeklyPlanQueryOptions(planAuth, orgSlug, next.year, next.week),
      );
    }

    queryClient.prefetchQuery(getPlanLocationsQueryOptions(planAuth, orgSlug));
  }, [auth, canViewTeam, memberId, orgSlug, queryClient, weekState.week, weekState.year]);

  const teamByUser = useMemo(
    () => groupTeamEntries(canViewTeam ? teamQuery.data ?? [] : []),
    [canViewTeam, teamQuery.data],
  );

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

  const teamMembers = Object.entries(teamByUser);
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
      <div className="rounded-2xl border border-border/50 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] mb-2">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <WeekNavigator
            year={weekState.year}
            week={weekState.week}
            onPrevious={() => maybeChangeWeek(-1)}
            onNext={() => maybeChangeWeek(1)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-5"
              onClick={handleCopyPreviousWeek}
              disabled={isWeekLoading || isLocationsLoading || saveMutation.isPending}
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy previous
            </Button>
            <Button
              type="button"
              className="rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-5 shadow-lg shadow-primary/10"
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending || isWeekLoading}
            >
              <Save className="mr-2 h-3.5 w-3.5" />
              {saveMutation.isPending ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-5 pt-4">
        <div className="flex items-center gap-4 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">My Plan</h2>
            <p className="text-[11px] text-muted-foreground/60 font-medium">
              Update your location for each day and save once finished.
            </p>
          </div>
        </div>

        <WeeklyPlanGrid
          year={weekState.year}
          week={weekState.week}
          entries={myEntries}
          drafts={drafts}
          locations={resolvedLocations}
          isLoading={isWeekLoading || isLocationsLoading || attendanceQuery.isLoading}
          actualByDate={actualByDate}
          onDraftChange={updateDraft}
        />
      </section>

      {canViewTeam ? (
        <section className="rounded-2xl border border-border/50 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Team Plans</h2>
              <p className="text-[11px] text-muted-foreground/60 font-medium">
                {teamMembers.length
                  ? `${teamMembers.length} teammates with saved plans this week`
                  : "No team plans submitted for this week yet."}
              </p>
            </div>
          </div>

          {teamMembers.length ? (
            <div className="flex flex-col gap-10">
              {teamMembers.map(([memberKey, value]) => (
                <div key={memberKey} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2">
                    <div>
                      <p className="text-[13px] font-bold text-foreground uppercase tracking-tight">
                        {value.name ?? memberKey}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                        {value.entries.length}/5 days planned
                      </p>
                    </div>
                  </div>
                  <WeeklyPlanGrid
                    year={weekState.year}
                    week={weekState.week}
                    entries={value.entries}
                    locations={resolvedLocations}
                    readOnly
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
});
