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
  { value: "team", label: "Manage People", icon: Users, requireTeam: true },
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
      !window.confirm("You have unsaved changes in this tab. Switch views anyway?")
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
    <div className="flex flex-col gap-6">
      <div className="w-full overflow-x-auto">
        <div className="inline-flex min-w-fit rounded-2xl border border-border bg-[#f5f5f7] p-1">
          {TAB_OPTIONS.filter((tab) => !tab.requireTeam || canViewTeam).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleViewChange(tab.value)}
                className={cn(
                  "relative flex min-w-[196px] items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-[13px] font-semibold transition-all duration-300",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:bg-white hover:text-foreground",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="plan-tab-pill"
                    className="absolute inset-0 rounded-[14px] bg-[#1d1d1f]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
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
