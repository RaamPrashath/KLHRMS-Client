'use client';

import { AlertTriangle, CalendarClock, Mail, User2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WarrantyExpirationFeedData } from './dashboard.types';

function formatExpiryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'MMM d, yyyy');
}

export function UpcomingExpirationsFeed({
  data,
  isLoading,
}: {
  data?: WarrantyExpirationFeedData;
  isLoading: boolean;
}) {
  const items = data?.items ?? [];

  return (
    <section className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full min-h-[295px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Upcoming Expirations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rolling 7-day warranty view for assigned hardware
          </p>
        </div>
        <span
          className={cn(
            'text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 border',
            items.length > 0
              ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          )}
        >
          {data?.total ?? 0} upcoming
        </span>
      </div>

      <div className="flex-1 my-2 overflow-y-auto pr-0.5 min-h-[180px] flex flex-col justify-start">
        {isLoading ? (
          <div className="space-y-3.5 w-full">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-border space-y-2 bg-slate-50/10 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-muted/60 rounded" />
                  <div className="h-4 w-12 bg-muted/60 rounded" />
                </div>
                <div className="h-3 w-40 bg-muted/40 rounded" />
                <div className="h-3 w-32 bg-muted/40 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/10 w-full h-full">
            <div className="w-10 h-10 bg-card rounded-xl shadow-sm border border-border flex items-center justify-center text-muted-foreground mb-2">
              <CalendarClock className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No upcoming expirations</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
              Assets expiring in the next 7 days will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3 w-full self-start">
            {items.map((item) => (
              <article
                key={`${item.assetId}:${item.assetUnitId ?? 'asset'}`}
                className="p-3.5 rounded-xl border border-border hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2 bg-slate-50/30 dark:bg-slate-900/10"
              >
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {item.assetName}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {item.assetCode}
                      {item.model ? ` · ${item.model}` : ''}
                      {item.serialNumber ? ` · ${item.serialNumber}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider shrink-0',
                      item.daysUntilExpiry === 0
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                    )}
                  >
                    {item.daysUntilExpiry === 0 ? 'Expires today' : `${item.daysUntilExpiry}d left`}
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <CalendarClock className="size-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">
                      Warranty: <span className="text-slate-900 dark:text-white font-semibold">{formatExpiryDate(item.warrantyExpiryDate)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <User2 className="size-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{item.employeeName || item.employeeEmail || 'Assigned employee'}</span>
                  </div>
                </div>

                {item.hasReminderSent && (
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded text-[10px] font-semibold">
                    <AlertTriangle className="size-3 shrink-0" />
                    Reminder Sent
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
