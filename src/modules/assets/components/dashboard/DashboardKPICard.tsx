'use client';
 
import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
 
export function DashboardKPICard({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: number;
  label: string;
  icon: ElementType;
  color: string;
}) {
  // Map colors and backgrounds to tailwind classes to match design.html precisely
  let iconBg = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  let valueColor = 'text-slate-900 dark:text-white';
 
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('available')) {
    iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
    valueColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (lowerLabel.includes('issued')) {
    iconBg = 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
    valueColor = 'text-blue-600 dark:text-blue-400';
  } else if (lowerLabel.includes('maintenance')) {
    iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
    valueColor = 'text-amber-600 dark:text-amber-400';
  } else if (lowerLabel.includes('ticket')) {
    iconBg = 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
    valueColor = 'text-rose-600 dark:text-rose-400';
  }
 
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={cn("flex p-3 rounded-xl shrink-0 items-center justify-center", iconBg)}>
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <h3 className={cn("text-2xl font-bold mt-0.5 tabular-nums", valueColor)}>
          {value}
        </h3>
      </div>
    </div>
  );
}
