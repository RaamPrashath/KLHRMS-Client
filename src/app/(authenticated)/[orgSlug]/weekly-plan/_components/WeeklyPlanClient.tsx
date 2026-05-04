"use client";

import { useEffect, useRef, useState } from "react";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WeekNavigator } from "./WeekNavigator";
import { WeeklyPlanGrid } from "./WeeklyPlanGrid";
import { useMyWeeklyPlanQuery, useTeamWeeklyPlanQuery } from "@/hooks/queries/weekly_plan";
import { useSetWeeklyPlanDayMutation } from "@/hooks/mutations/weekly_plan";
import type { DayDraft } from "./DayColumn";
import type { WeeklyPlanEntry } from "@/types/weekly_plan";
import { WorkLocationType } from "@/types/weekly_plan";

export interface WeeklyPlanClientProps {
  orgSlug: string;
  orgId: string;
  canViewTeam: boolean;
}

function buildDraftsFromEntries(entries: WeeklyPlanEntry[]): Record<string, DayDraft> {
  return entries.reduce<Record<string, DayDraft>>((acc, entry) => {
    acc[entry.date] = {
      work_location: entry.work_location as WorkLocationType,
      project: entry.project ?? "",
    };
    return acc;
  }, {});
}

/**
 * Compute the current ISO year+week safely inside a lazy useState initializer.
 * Calling new Date() inside the initializer function means it only runs once
 * on the client — never during SSR — which prevents hydration mismatches.
 */
function getCurrentWeek(): { year: number; week: number } {
  const now = new Date();
  return { year: getISOWeekYear(now), week: getISOWeek(now) };
}

export function WeeklyPlanClient({ orgSlug, orgId, canViewTeam }: WeeklyPlanClientProps) {
  // Lazy initializer — runs only on the client, never during SSR
  const [{ year, week }, setYearWeek] = useState(getCurrentWeek);
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  // Use a ref for isDirty so the useEffect below never needs it as a dep
  const isDirtyRef = useRef(false);
  // Separate state just for the Save button disabled logic
  const [isDirty, setIsDirty] = useState(false);

  const {
    data: myEntries = [],
  } = useMyWeeklyPlanQuery(orgSlug, orgId, year, week);

  const {
    data: teamEntries = [],
  } = useTeamWeeklyPlanQuery(orgSlug, orgId, year, week);

  const { mutateAsync: setDay, isPending: isSaving } =
    useSetWeeklyPlanDayMutation(orgSlug, orgId, year, week);

  // Reset drafts to saved state when fresh data arrives — but only when the
  // user hasn't made unsaved edits. We read isDirty from a ref so this effect
  // doesn't need isDirty in its dependency array (which would cause an infinite
  // loop: setDrafts → re-render → new myEntries reference → effect fires again).
  useEffect(() => {
    if (!isDirtyRef.current) {
      setDrafts(buildDraftsFromEntries(myEntries));
    }
  }, [myEntries]);

  function handleDraftChange(date: string, draft: DayDraft) {
    setDrafts((prev) => ({ ...prev, [date]: draft }));
    isDirtyRef.current = true;
    setIsDirty(true);
  }

  function handleWeekChange(y: number, w: number) {
    setYearWeek({ year: y, week: w });
    isDirtyRef.current = false;
    setIsDirty(false);
    setDrafts({});
  }

  async function handleSave() {
    const daysToSave = Object.entries(drafts).filter(
      ([, d]) => d.work_location !== "",
    );

    if (daysToSave.length === 0) {
      toast.info("Select a location for at least one day first.");
      return;
    }

    try {
      await Promise.all(
        daysToSave.map(([date, draft]) =>
          setDay({
            date,
            input: {
              work_location: draft.work_location as WorkLocationType,
              project: draft.project.trim() || null,
            },
          }),
        ),
      );
      toast.success("Weekly plan saved");
      isDirtyRef.current = false;
      setIsDirty(false);
    } catch {
      // Individual errors are already toasted by the mutation's onError
    }
  }

  const teamByUser = teamEntries.reduce<
    Record<string, { name: string | null; entries: WeeklyPlanEntry[] }>
  >((acc, entry) => {
    const uid = entry.user_id;
    if (!acc[uid]) acc[uid] = { name: entry.user_name, entries: [] };
    acc[uid].entries.push(entry);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <WeekNavigator year={year} week={week} onChange={handleWeekChange} />
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          size="sm"
          className="gap-1.5"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save Plan"}
        </Button>
      </div>

      {/* My plan */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">My Plan</h2>
        <WeeklyPlanGrid
          year={year}
          week={week}
          entries={myEntries}
          drafts={drafts}
          onDraftChange={handleDraftChange}
        />
      </div>

      {/* Team plan */}
      {canViewTeam && (
        <>
          <Separator />
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Team Plans</h2>
            {Object.keys(teamByUser).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team plans submitted for this week yet.
              </p>
            ) : (
              Object.entries(teamByUser).map(([userId, { name, entries: userEntries }]) => (
                <div key={userId} className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground truncate">
                    {name || userId}
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
