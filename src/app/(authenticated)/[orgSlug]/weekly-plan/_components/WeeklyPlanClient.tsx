"use client";

import { useEffect, useRef, useState } from "react";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { Save, Users, User, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { WeekNavigator } from "./WeekNavigator";
import { WeeklyPlanGrid } from "./WeeklyPlanGrid";
import { useMyWeeklyPlanQuery, useTeamWeeklyPlanQuery } from "@/hooks/queries/weekly_plan";
import { useSetWeeklyPlanDayMutation } from "@/hooks/mutations/weekly_plan";
import type { DayDraft } from "./DayColumn";
import type { WeeklyPlanEntry } from "@/types/weekly_plan";
import { WorkLocationType } from "@/types/weekly_plan";
import { cn } from "@/lib/utils";

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

function getCurrentWeek(): { year: number; week: number } {
  const now = new Date();
  return { year: getISOWeekYear(now), week: getISOWeek(now) };
}

// Planner-style avatar initials
function getInitials(name: string | null, fallback: string): string {
  if (!name) return fallback.slice(0, 2).toUpperCase();
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Deterministic avatar color from user id
const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];
function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function WeeklyPlanClient({ orgSlug, orgId, canViewTeam }: WeeklyPlanClientProps) {
  const [{ year, week }, setYearWeek] = useState(getCurrentWeek);
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  // Track which team members are expanded (Planner-style collapsible rows)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const { data: myEntries = [] } = useMyWeeklyPlanQuery(orgSlug, orgId, year, week);
  const { data: teamEntries = [] } = useTeamWeeklyPlanQuery(orgSlug, orgId, year, week);
  const { mutateAsync: setDay, isPending: isSaving } = useSetWeeklyPlanDayMutation(orgSlug, orgId, year, week);

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
    const daysToSave = Object.entries(drafts).filter(([, d]) => d.work_location !== "");
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
      // Individual errors toasted by mutation onError
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

  const teamUserIds = Object.keys(teamByUser);

  function toggleMember(uid: string) {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-0 -mx-6">
      {/* ── Planner-style command bar ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-background sticky top-0 z-10">
        <WeekNavigator year={year} week={week} onChange={handleWeekChange} />

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {isDirty && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="gap-1.5 h-8 text-xs font-semibold"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? "Saving…" : "Save Plan"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── My Plan section ── */}
      <div className="px-6 pt-5 pb-6">
        {/* Section label — Planner "My Tasks" style */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-foreground text-background shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">My Plan</span>
          <span className="text-xs text-muted-foreground font-medium">
            Week {week}
          </span>
        </div>

        <WeeklyPlanGrid
          year={year}
          week={week}
          entries={myEntries}
          drafts={drafts}
          onDraftChange={handleDraftChange}
        />
      </div>

      {/* ── Team Plans section ── */}
      {canViewTeam && (
        <div className="border-t">
          {/* Team section header */}
          <div className="px-6 pt-5 pb-3 flex items-center gap-2.5">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted shrink-0">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Team Plans</span>
            {teamUserIds.length > 0 && (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {teamUserIds.length}
              </span>
            )}
          </div>

          {teamUserIds.length === 0 ? (
            <div className="px-6 pb-8">
              <p className="text-sm text-muted-foreground">
                No team plans submitted for this week yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {teamUserIds.map((userId) => {
                const { name, entries: userEntries } = teamByUser[userId];
                const isExpanded = expandedMembers.has(userId);
                const initials = getInitials(name, userId);
                const color = avatarColor(userId);

                // Count how many days have entries
                const filledDays = userEntries.filter((e) => e.work_location).length;

                return (
                  <div key={userId} className="px-6">
                    {/* Member row — Planner bucket header style */}
                    <button
                      onClick={() => toggleMember(userId)}
                      className={cn(
                        "w-full flex items-center gap-3 py-3 text-left",
                        "hover:bg-muted/30 -mx-6 px-6 transition-colors",
                      )}
                      aria-expanded={isExpanded}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                          "text-white text-[11px] font-bold",
                          color,
                        )}
                      >
                        {initials}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {name || userId}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {filledDays}/5 days
                        </span>
                      </div>

                      {/* Expand chevron */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="shrink-0"
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </button>

                    {/* Expanded grid */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pb-5 pt-1">
                            <WeeklyPlanGrid
                              year={year}
                              week={week}
                              entries={userEntries}
                              readOnly
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
