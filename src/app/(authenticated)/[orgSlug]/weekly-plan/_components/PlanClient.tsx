"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthlyPlanPanel } from "./MonthlyPlanPanel";
import { WeeklyPlanPanel } from "./WeeklyPlanPanel";

type PlanView = "weekly" | "monthly";

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
}> = [
  { value: "weekly", label: "Weekly Plan", icon: Rows3 },
  { value: "monthly", label: "Monthly Plan", icon: CalendarRange },
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
    return view === "monthly" ? "monthly" : "weekly";
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
      <div className="w-full lg:w-[30%] rounded-xl border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,248,250,0.96))] p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-md">
        <div className="grid grid-cols-2 gap-1.5">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleViewChange(tab.value)}
                className={cn(
                  "relative flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-all duration-300",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:bg-white/80 hover:text-foreground",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="plan-tab-pill"
                    className="absolute inset-0 rounded-lg bg-[#111111] shadow-[0_8px_20px_rgba(17,17,17,0.18)]"
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
          {activeView === "weekly" ? (
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
                canViewTeam={canViewTeam}
                onDirtyChange={setWeeklyDirty}
              />
            </motion.div>
          ) : (
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
        </AnimatePresence>
      </div>
    </div>
  );
}
