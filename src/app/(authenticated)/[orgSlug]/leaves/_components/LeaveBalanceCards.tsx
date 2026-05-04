"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useLeaveBalancesQuery } from "@/hooks/queries/leave";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, AlertCircle, TrendingUp } from "lucide-react";

interface LeaveBalanceCardsProps {
  orgSlug: string;
  orgId: string;
}

export function LeaveBalanceCards({ orgSlug, orgId }: LeaveBalanceCardsProps) {
  const { data: balances = [], isLoading } = useLeaveBalancesQuery(
    orgSlug,
    orgId,
    undefined,
    new Date().getFullYear(),
  );

  // Notify the employee once when their balance is empty so they know
  // they cannot submit leave requests until HR allocates a balance.
  useEffect(() => {
    if (!isLoading && balances.length === 0) {
      toast.warning("No leave balance", {
        description: "You have no leave balance for this year. Contact HR to allocate your balance before submitting a request.",
        duration: 6000,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const totals = useMemo(
    () =>
      balances.reduce(
        (acc, b) => {
          acc.allocated += b.allocated + b.carried_forward;
          acc.used += b.used;
          acc.remaining += b.remaining;
          return acc;
        },
        { allocated: 0, used: 0, remaining: 0 },
      ),
    [balances],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
        <div className="rounded-full bg-muted/60 p-4">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">No leave balances</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Contact HR to allocate your leave balances for this year.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-px rounded-xl border overflow-hidden bg-border shadow-sm">
        {[
          { label: "Total Allocated", value: totals.allocated, sub: "days this year" },
          { label: "Days Used", value: totals.used, sub: "leave taken" },
          { label: "Days Remaining", value: totals.remaining, sub: "available" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-card px-6 py-5 flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className="text-3xl font-bold tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Per-type balance cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance) => {
          const total = balance.allocated + balance.carried_forward;
          const pct = total > 0 ? Math.min(100, Math.round((balance.used / total) * 100)) : 0;
          const isLow = balance.remaining < total * 0.2 && total > 0;
          const color = balance.leave_type_color || "#94a3b8";

          return (
            <div
              key={balance.id}
              className="rounded-xl border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200"
              style={{ borderTop: `3px solid ${color}` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-bold">
                    {balance.leave_type_name || "Leave"}
                  </span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                  {balance.year}
                </span>
              </div>

              {/* Remaining count */}
              <div className="flex items-baseline gap-1.5">
                <span
                  className={[
                    "text-4xl font-black tabular-nums leading-none",
                    isLow ? "text-amber-600" : "text-foreground",
                  ].join(" ")}
                >
                  {balance.remaining % 1 === 0
                    ? balance.remaining
                    : balance.remaining.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  / {total} days left
                </span>
              </div>

              {/* Progress */}
              <div className="flex flex-col gap-1.5">
                <Progress
                  value={pct}
                  className={[
                    "h-2 rounded-full",
                    isLow ? "[&>div]:bg-amber-500" : "",
                  ].join(" ")}
                  style={!isLow ? { ["--progress-color" as string]: color } : {}}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{balance.used} used</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
              </div>

              {/* Footnotes */}
              <div className="flex flex-col gap-1.5">
                {balance.carried_forward > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    {balance.carried_forward} carried forward
                  </p>
                )}
                {isLow && (
                  <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Low balance
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}