'use client';

import { Clock, Wrench } from 'lucide-react';
import { formatDate } from '@/modules/assets/lib/assetUtils';
import { humanize } from '@/modules/assets/lib/assetUtils';
import type { TicketAlertItem } from './dashboard.types';

const statusDot: Record<string, { bg: string; pulse: boolean }> = {
  OPEN: { bg: '#dc2626', pulse: true },
  IN_PROGRESS: { bg: '#d97706', pulse: false },
};

export function OpenTicketList({ tickets }: { tickets: TicketAlertItem[] }) {
  if (!tickets.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f3fbf5]">
          <Wrench className="size-5 text-[#00874a]" />
        </div>
        <p className="mt-2 text-[13px] font-medium text-[#1d1d1f]">All clear</p>
        <p className="mt-0.5 text-[12px] text-[#6e6e73]">No open maintenance tickets</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#eef0f3]">
      {tickets.map((ticket) => {
        const dot = statusDot[ticket.status] || statusDot.OPEN;
        return (
          <div key={ticket.id} className="flex items-start gap-3 py-3">
            <div className="relative mt-1 shrink-0">
              <span
                className="block size-2.5 rounded-full"
                style={{ backgroundColor: dot.bg }}
              />
              {dot.pulse && (
                <span
                  className="absolute inset-0 size-2.5 animate-ping rounded-full opacity-40"
                  style={{ backgroundColor: dot.bg }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-neutral-400">
                  {ticket.ticketId}
                </span>
                <span className="text-[13px] font-medium text-[#1d1d1f] truncate">
                  {ticket.assetName}
                </span>
                <span className="shrink-0 rounded-full bg-[#f0f4f8] px-2 py-0.5 text-[10px] font-medium text-[#6b7280]">
                  {humanize(ticket.maintenanceType)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-[#6e6e73]">
                {ticket.issueDescription}
              </p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDate(ticket.createdAt)}
                </span>
                <span
                  className={`font-medium ${
                    ticket.status === 'OPEN' ? 'text-[#dc2626]' : 'text-[#d97706]'
                  }`}
                >
                  {humanize(ticket.status)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
