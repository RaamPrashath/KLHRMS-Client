'use client';
 
import { MonitorCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OsDistributionAnalytics } from './dashboard.types';
 
function EmptyState({
  title,
  description,
  tone = 'muted',
}: {
  title: string;
  description: string;
  tone?: 'muted' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center bg-slate-50/50 dark:bg-slate-900/10',
        tone === 'warning' ? 'border-amber-200 dark:border-amber-900/30' : 'border-border',
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-card border border-border shadow-sm text-muted-foreground mb-2">
        <MonitorCog className="size-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}
 
const getOsColors = (osName: string) => {
  const name = osName.toLowerCase();
  if (name.includes('windows')) {
    return { bg: 'bg-blue-600', dot: 'bg-blue-600' };
  }
  if (name.includes('mac') || name.includes('os x') || name.includes('apple')) {
    return { bg: 'bg-slate-700 dark:bg-slate-300', dot: 'bg-slate-700 dark:bg-slate-300' };
  }
  if (name.includes('linux') || name.includes('ubuntu') || name.includes('debian')) {
    return { bg: 'bg-amber-600', dot: 'bg-amber-600' };
  }
  return { bg: 'bg-slate-400', dot: 'bg-slate-400' };
};
 
export function OsDistributionCard({
  data,
  isLoading,
  isError,
}: {
  data?: OsDistributionAnalytics;
  isLoading: boolean;
  isError: boolean;
}) {
  const rows = data?.rows ?? [];
  const totalUsers = data?.totalLaptopUsers ?? 0;
 
  return (
    <section className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full min-h-[295px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">OS Distribution</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Laptop software ecosystem across assigned deployment</p>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg font-medium shrink-0">
          {totalUsers} {totalUsers === 1 ? 'user' : 'users'}
        </span>
      </div>
 
      <div className="space-y-4 my-2 flex-1 overflow-y-auto pr-0.5">
        {isLoading ? (
          <div className="space-y-3.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-muted/60 animate-pulse rounded" />
                  <div className="h-4 w-12 bg-muted/60 animate-pulse rounded" />
                </div>
                <div className="h-2.5 w-full bg-muted/40 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            tone="warning"
            title="OS analytics unavailable"
            description="The dashboard stayed up, but this analytics feed did not return data."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No OS distribution yet"
            description="Assigned laptop inventory with operating-system metadata will appear here."
          />
        ) : (
          rows.map((row) => {
            const colors = getOsColors(row.osName);
            const pct = Math.round(row.percentage);
            return (
              <div key={row.osName} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", colors.dot)}></span>
                    {row.osName}
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold font-mono">
                    {row.headcount} <span className="text-[10px] text-muted-foreground font-normal ml-0.5">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", colors.bg)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
