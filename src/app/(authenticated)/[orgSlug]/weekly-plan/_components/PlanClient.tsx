"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Rows3, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthlyPlanPanel } from "./MonthlyPlanPanel";
import { WeeklyPlanPanel } from "./WeeklyPlanPanel";
import { ManagePeoplePanel } from "./ManagePeoplePanel";

type PlanView = "weekly" | "monthly" | "team";

interface PlanClientProps {
  orgSlug: string;
  orgId: string;
  memberId: string;
  userId: string;
  canViewTeam: boolean;
}

const TAB_OPTIONS: Array<{
  value: PlanView;
  label: string;
  icon: React.ElementType;
  requireTeam?: boolean;
}> = [
  { value: "weekly", label: "Weekly Plan", icon: Rows3 },
  { value: "monthly", label: "Monthly Plan", icon: CalendarRange },
  { value: "team", label: "View Plan", icon: Users, requireTeam: true },
];

export function PlanClient({
  orgSlug,
  orgId,
  memberId,
  userId,
  canViewTeam,
}: PlanClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [weeklyDirty, setWeeklyDirty] = useState(false);
  const [monthlyDirty, setMonthlyDirty] = useState(false);

  const activeView = useMemo<PlanView>(() => {
    const view = searchParams.get("view");
    if (view === "monthly") return "monthly";
    if (view === "team") return "team";
    return "weekly";
  }, [searchParams]);

  function handleViewChange(nextView: PlanView) {
    if (nextView === activeView) return;

    const hasUnsavedChanges =
      (activeView === "weekly" && weeklyDirty) ||
      (activeView === "monthly" && monthlyDirty);

    if (
      hasUnsavedChanges &&
      !globalThis.confirm("You have unsaved changes in this tab. Switch views anyway?")
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextView === "weekly") nextParams.delete("view");
    else nextParams.set("view", nextView);

    const queryString = nextParams.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-6 mx-7 mb-7">
      <div className="flex items-center gap-1">
        {TAB_OPTIONS.filter((tab) => !tab.requireTeam || canViewTeam).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleViewChange(tab.value)}
              className={cn(
                'relative px-5 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-[#1d1d1f] text-white'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/[0.04]',
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeView === "weekly" && (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <WeeklyPlanPanel
                orgSlug={orgSlug}
                orgId={orgId}
                memberId={memberId}
                userId={userId}
                onDirtyChange={setWeeklyDirty}
              />
            </motion.div>
          )}

          {activeView === "monthly" && (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <MonthlyPlanPanel
                orgSlug={orgSlug}
                orgId={orgId}
                memberId={memberId}
                userId={userId}
                onDirtyChange={setMonthlyDirty}
              />
            </motion.div>
          )}

          {activeView === "team" && canViewTeam && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <ManagePeoplePanel
                orgSlug={orgSlug}
                orgId={orgId}
                memberId={memberId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
