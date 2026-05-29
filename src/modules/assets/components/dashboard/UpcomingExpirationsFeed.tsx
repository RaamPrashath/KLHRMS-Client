'use client';

import { AlertTriangle, CalendarClock, Mail, User2 } from 'lucide-react';
import { format } from 'date-fns';
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
    <section className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
            Upcoming Expirations
          </h3>
          <p className="mt-1 text-[13px] text-[#6e6e73]">
            Rolling 7-day warranty view for assigned organizational hardware
          </p>
        </div>
        <div className="rounded-full bg-[#fff7e8] px-3 py-1 text-[12px] font-semibold text-[#8a5a00]">
          {data?.total ?? 0} upcoming
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-18 animate-pulse rounded-2xl bg-[#f3f4f6]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d8dde5] bg-[#fbfcfb] px-4 py-8 text-center">
          <CalendarClock className="mx-auto size-5 text-[#9ca3af]" />
          <p className="mt-2 text-[14px] font-medium text-[#111827]">No upcoming expirations</p>
          <p className="mt-1 text-[13px] text-[#6e6e73]">
            Assets expiring in the next 7 days will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={`${item.assetId}:${item.assetUnitId ?? 'asset'}`}
              className="rounded-2xl border border-[#eef0f3] bg-[#fbfcfb] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#111827]">
                    {item.assetName}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#6e6e73]">
                    {item.assetCode}
                    {item.model ? ` · ${item.model}` : ''}
                    {item.serialNumber ? ` · ${item.serialNumber}` : ''}
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-[#fff3f2] px-2.5 py-1 text-[11px] font-semibold text-[#b3261e]">
                  {item.daysUntilExpiry === 0 ? 'Expires today' : `${item.daysUntilExpiry} days left`}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#4b5563]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5 text-[#8a5a00]" />
                  Warranty expires {formatExpiryDate(item.warrantyExpiryDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User2 className="size-3.5 text-[#2563eb]" />
                  {item.employeeName || item.employeeEmail || 'Assigned employee'}
                </span>
                {item.employeeEmail && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5 text-[#6b7280]" />
                    {item.employeeEmail}
                  </span>
                )}
              </div>

              {item.hasReminderSent && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#eef9f1] px-2.5 py-1 text-[11px] font-semibold text-[#156f3d]">
                  <AlertTriangle className="size-3.5" />
                  7-day reminder already dispatched
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
