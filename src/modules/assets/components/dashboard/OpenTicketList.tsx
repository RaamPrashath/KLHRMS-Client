'use client';

import { Clock, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { TicketAlertItem } from './dashboard.types';

export function OpenTicketList({ tickets }: { tickets: TicketAlertItem[] }) {
  // Filter strictly for open tickets
  const openTicketsOnly = tickets.filter((t) => t.status === 'OPEN');

  return (
    <section className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full min-h-[380px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Open Tickets</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Active hardware maintenance incidents</p>
        </div>
        {openTicketsOnly.length > 0 && (
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-rose-500 animate-pulse" />
        )}
      </div>

      <div className="flex-1 my-2 overflow-y-auto pr-1 min-h-[240px] flex flex-col justify-start">
        {openTicketsOnly.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/10 w-full h-full">
            <div className="w-10 h-10 bg-card rounded-xl shadow-sm border border-border flex items-center justify-center text-muted-foreground mb-2">
              <Wrench className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No open tickets</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
              Active hardware maintenance incidents will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border w-full self-start">
            {openTicketsOnly.map((ticket) => {
              return (
                <div key={ticket.id} className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
                  <div className="relative mt-1.5 shrink-0">
                    <span className="block size-2.5 rounded-full bg-rose-500" />
                    <span className="absolute inset-0 size-2.5 animate-ping rounded-full bg-rose-500 opacity-40" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {ticket.assetName}
                      </span>
                      <span className="text-[10px] font-bold font-mono text-muted-foreground shrink-0">
                        #{ticket.ticketId}
                      </span>
                      <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-border">
                        {humanize(ticket.maintenanceType)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {ticket.issueDescription}
                    </p>
                    <div className="pt-0.5 flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                        {formatDate(ticket.createdAt)}
                      </span>
                      <span className="font-bold uppercase tracking-wider text-[9px] text-rose-600 dark:text-rose-400">
                        {humanize(ticket.status)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
