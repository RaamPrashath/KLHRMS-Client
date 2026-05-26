'use client';

import { LaptopMinimal, MonitorCog } from 'lucide-react';
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
        'flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center',
        tone === 'warning'
          ? 'border-[#f1d7a7] bg-[#fff8ea]'
          : 'border-[#d8dde5] bg-[#fbfcfb]',
      )}
    >
      <div
        className={cn(
          'flex size-11 items-center justify-center rounded-2xl',
          tone === 'warning' ? 'bg-white text-[#8a5a00]' : 'bg-white text-[#6e6e73]',
        )}
      >
        <MonitorCog className="size-5" />
      </div>
      <p className="mt-3 text-[15px] font-medium text-[#111827]">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] leading-5 text-[#6e6e73]">{description}</p>
    </div>
  );
}

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
  const topRow = rows[0];
  const topRowLabel = topRow?.osName ?? 'Unknown OS';
  const topRowHeadcount = topRow?.headcount ?? 0;
  const topRowPercentage = Math.round(topRow?.percentage ?? 0);

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className="border-b border-[#eef0f3] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
              OS Distribution
            </h3>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              Laptop user operating systems across currently assigned inventory
            </p>
          </div>
          <div className="rounded-full bg-[#f3f8f5] px-3 py-1 text-[12px] font-semibold text-[#156f3d]">
            {data?.totalLaptopUsers ?? 0} users
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-[24px] bg-[#f3f4f6]" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-[#f3f4f6]" />
                  <div className="h-4 w-16 animate-pulse rounded bg-[#f3f4f6]" />
                </div>
                <div className="h-2.5 animate-pulse rounded-full bg-[#f3f4f6]" />
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
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#dce9df] bg-[linear-gradient(135deg,#f7fbf7_0%,#eef8f2_52%,#f9fcfa_100%)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                    Most common environment
                  </p>
                  <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[#111827]">
                    {topRowLabel}
                  </p>
                  <p className="mt-1 text-[13px] text-[#4b5563]">
                    {topRowHeadcount} users, {topRowPercentage}% of assigned laptop users
                  </p>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#156f3d] shadow-[0_8px_24px_rgba(0,135,74,0.08)]">
                  <LaptopMinimal className="size-5" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => (
                <article
                  key={row.osName}
                  className="rounded-[20px] border border-[#eef0f3] bg-[#fbfcfb] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-[#111827]">{row.osName}</span>
                        {index === 0 && (
                          <span className="rounded-full bg-[#eaf6ee] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#156f3d]">
                            Leading
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#6e6e73]">
                        {row.headcount} {row.headcount === 1 ? 'user' : 'users'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-semibold tracking-tight text-[#111827]">
                        {Math.round(row.percentage)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e9eef2]">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        index === 0 ? 'bg-[#00874a]' : index === 1 ? 'bg-[#2563eb]' : 'bg-[#94a3b8]',
                      )}
                      style={{ width: `${Math.min(Math.max(row.percentage, 0), 100)}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
