"use client";

import { useState } from "react";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { WeekNavigator } from "./WeekNavigator";
import { WeeklyPlanGrid } from "./WeeklyPlanGrid";
import { useMyWeeklyPlanQuery, useTeamWeeklyPlanQuery } from "@/hooks/queries/weekly_plan";
import { useSetWeeklyPlanDayMutation } from "@/hooks/mutations/weekly_plan";
import type { SetDayInput, WeeklyPlanEntry } from "@/types/weekly_plan";

export interface WeeklyPlanClientProps {
  orgSlug:     string;
  canViewTeam: boolean;
}

export function WeeklyPlanClient({ orgSlug, canViewTeam }: WeeklyPlanClientProps) {
  const now  = new Date();
  const [year, setYear] = useState(() => getISOWeekYear(now));
  const [week, setWeek] = useState(() => getISOWeek(now));

  const { data: myEntries = [], isFetching: myFetching } =
    useMyWeeklyPlanQuery(orgSlug, year, week);

  const { data: teamEntries = [], isFetching: teamFetching } =
    useTeamWeeklyPlanQuery(orgSlug, year, week);

  const { mutate: setDay } = useSetWeeklyPlanDayMutation(orgSlug, year, week);

  function handleDayChange(date: string, input: SetDayInput) {
    setDay(
      { date, input },
      {
        onSuccess: () => toast.success("Plan saved"),
        onError:   (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
      },
    );
  }

  function handleWeekChange(y: number, w: number) {
    setYear(y);
    setWeek(w);
  }

  // Group team entries by userId for the team view
  const teamByUser = teamEntries.reduce<Record<string, WeeklyPlanEntry[]>>(
    (acc, entry) => {
      if (!acc[entry.userId]) acc[entry.userId] = [];
      acc[entry.userId].push(entry);
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Week navigation */}
      <WeekNavigator year={year} week={week} onChange={handleWeekChange} />

      {/* My plan */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">My Plan</h2>
          {myFetching && (
            <span className="text-xs text-muted-foreground">Updating…</span>
          )}
        </div>
        <WeeklyPlanGrid
          year={year}
          week={week}
          entries={myEntries}
          onDayChange={handleDayChange}
        />
      </div>

      {/* Team plan — managers / HR / admin / super_admin only */}
      {canViewTeam && (
        <>
          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Team Plans</h2>
              {teamFetching && (
                <span className="text-xs text-muted-foreground">Updating…</span>
              )}
            </div>

            {Object.keys(teamByUser).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team plans submitted for this week yet.
              </p>
            ) : (
              Object.entries(teamByUser).map(([userId, userEntries]) => (
                <div key={userId} className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {userId}
                  </p>
                  <WeeklyPlanGrid
                    year={year}
                    week={week}
                    entries={userEntries}
                    readOnly
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
